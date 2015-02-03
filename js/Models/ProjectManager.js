var SPM = SPM || {};
SPM.Models = SPM.Models || {};

var parseLeader = function (project) {
    var leader = SPM.Utils.parseGetValueFromKey(project.desc, 'leader');
    if (!leader) {
        project.errors.noLeader = true;
        return false;
    }
    leader = SPM.Utils.unaccent(leader);
    var leaderFound = project.members.some(function (member) {
        var memberName = SPM.Utils.unaccent(member.fullName.toLowerCase());
        if (leader.indexOf(memberName)) {
            member.isLeader = true;
            return true;
        }
        return false;
    });
    if (leaderFound) {
        // Leader first
        project.members.sort(function (member1, member2) {
            return (member1.isLeader) ? -1 : (member2.isLeader) ? 1 : 0;
        });
    } else {
        project.errors.unknownLeader = true;
    }
    return leaderFound;
}

var parseSlack = function(project) {
    var slack = SPM.Utils.parseGetValueFromKey(project.desc, '(slack|channel|chanel|chan)');
    if (!slack) {
        return
    }
    if (slack[0] === '#') {
        // With the # syntax
        slack = slack.slice(1)
    } else if(slack[0] === '[') {
        // With the [name](url) syntax
        var index = slack.indexOf(']');
        slack = slack.slice(1, index);
    }
    if(slack.indexOf('p-') !== 0) {
        return null;
    }
    project.slack = slack;
    project.slackId = SPM.Models.ChannelManager.getChannelIdFromChannelName(project.slack);
    return project.slack;
}

var checkErrors = function (project) {
    if (project.idMembers.length > 5) {project.errors.tooManyMembers = true};
    if (project.idMembers.length < 2) {project.errors.tooFewMembers = true};
    if (project.name.match(/^#?p-.*/)) {project.errors.titleIsSlackChan = true};
};

var initProject = function(project) {
    project.errors = {};
    var leader = parseLeader(project);

    var slack = parseSlack(project);
    // Need to 2x the line break for ISO trello markdown rendering
    project.desc = SPM.Utils.doubleLineBreak(project.desc);
    // Capitalize first letter
    project.name = project.name.charAt(0).toUpperCase() + project.name.slice(1);
    checkErrors(project);
    return project;
};


SPM.Models.ProjectManager = {
    isMyProject: function(project) {
        return _.find(project.members, function(member) {
            return SPM.Models.MemberManager.me.id == member.id;
        })
    },

    findProject: function(query) {
        return SPM.TrelloConnector.request("get","/search", {
            "query": '"'+query+'"',
            "idOrganizations": _.map(SPM.Models.BoardManager.boards, function(board) {return board.idOrganization}),
            "idBoards" : _.map(SPM.Models.BoardManager.boards, function(board) {return board.id}),
            "modelTypes": "cards",
            "card_members": true
        })
        .then(function(result) {

            var cards = result.cards;
            var card;
            if (! cards.length) {
                // console.warn("No Trello cards found for the project " + query);
                card = null;
            } else {
                card = initProject(cards[0]);
                SPM.Storages.ProjectStorage.saveProject(card);
            }
            if (cards.length > 1) {
                console.warn("More than one Trello cards found for the project " + query, cards);
            }
            return card;
        }.bind(this));
    },

    findMyProjects: function () {  
        return SPM.TrelloConnector.request("get", "/members/me/cards", {
            "members": true,
            "filter": "open",
            "limit": 1000
        }).then(function (cards) {
            // filter cards to keep only the one in the orga board
            var cards = cards
                .filter(function (card) {
                    return SPM.Models.BoardManager.isRegistredBoard(card.idBoard);
                })
                .map(initProject)
            return SPM.Storages.ProjectStorage.saveMyProjects(cards)
        });
    },

    findProjectByChannelName: function (channelName) {
        return this.findProject(channelName)
            .then(function (project) {
                SPM.Storages.ProjectStorage.setProjectChannel(channelName, project);
                return project;
            });
    },

    getMyProjects: function () {
        return SPM.Storages.ProjectStorage.getMyProjects()
            .catch(function () {
                return this
                    .findMyProjects()
                    .then(this.getMyProjects.bind(this))
            }.bind(this))
    },

    getProjectByChannelName: function (channelName) {
        return SPM.Storages.ProjectStorage.getByChannelName(channelName)
            .catch(function () {
                return this
                    .findProjectByChannelName(channelName)
                    .then(this.getProjectByChannelName.bind(this, channelName))
            }.bind(this))
    }

}