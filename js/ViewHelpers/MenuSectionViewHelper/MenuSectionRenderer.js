var SPM = SPM || {};
SPM.ViewHelpers = SPM.ViewHelpers || {};

SPM.ViewHelpers.SectionRenderer = {

    codeInserted: false,

    addSection: function(id, title, channels, first) {
        var section = {};
        section.title = title;
        section.channels = channels;
        section.id = id;
        section.first = first;
        this.initTemplate();
        if (!this.codeInserted) {
            SPM.CodeInjector.injectFile("js/ViewHelpers/MenuSectionViewHelper/menuSectionInjectedCode.js");
            this.codeInserted = true;
        }
        this.addSectionDivIfNotExist(section);
        this.initRenderLoop(function() {
            this.update(section);
        }.bind(this));
    },

    timerUpdate: null,
    initRenderLoop: function(callback) {
        this.timerUpdate = setInterval(function() {
            callback();
        }.bind(this), 100);
    },

    update: function(section) {
        this.updateMenuItem(section);
    },


    addSectionDivIfNotExist: function(section) {
        var div = '<div id="' + section.id + '" class="SPM-section-added section_holder"></div>';
        if ($("#starred_div").length > 0) {
            if (section.first) {
                $("#starred_div").after(div);
            } else {
                $("#channels").before(div);
            }

        } else {
            if (section.first) {
                $("#channels_scroller").prepend(div);
            } else {
                $("#channels").before(div);
            }
        }

        this.template.update(section.id, {
            channels: section.channels,
            title: section.title
        });

    },

    updateMenuItem: function(section) {
        $("#" + section.id + " li.channel").each(function(index) {
            var id = $(this).find(".channel_name").attr("data-channel-id");
            if ($(this)[0].outerHTML != $("#channel-list .channel_"+id)[0].outerHTML) {
                $(this).replaceWith($("#channel-list .channel_"+id).clone());
            }
        })
    },

    template: null,
    initTemplate: function() {
        if (this.template === null) {
            this.template = new EJS({url: chrome.extension.getURL('js/ViewHelpers/MenuSectionViewHelper/menuSection.ejs')});
        }
    },


}