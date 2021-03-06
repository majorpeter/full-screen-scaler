
const St = imports.gi.St;
const Main = imports.ui.main;
const Lang = imports.lang;
const Clutter = imports.gi.Clutter;
const Tweener = imports.ui.tweener;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Utils = Extension.imports.utils;
const MaximusFunc = Extension.imports.maximus_functions;
const prettyPrint = Utils.prettyPrint;

const FullScreenScaler = new Lang.Class({
    Name: 'FullScreenScaler.FullScreenScaler',
    Extends: PanelMenu.Button,


	zoomSurface: null,
    currentWindow: null,

    _init: function() {
        this.parent(0.0, _("Full Screen Scaler"));

        let hbox = new St.BoxLayout({ style_class: 'panel-status-menu-box' });
        let icon = new St.Icon({ icon_name: 'zoom-fit-best',
                                 style_class: 'system-status-icon' });

        hbox.add_child(icon);
        this.actor.add_child(hbox);
        this.menu.addAction(_("Open File"), function(event) {
        });
    },

    destroy: function() {
    	this.destroyZoomSurface();
    	this.parent();
    },

    removeAllMenuItems: function() {
    	this.menu._getMenuItems().forEach(function (mItem) {
			mItem.destroy();
		});
    },

    sortWindowsCompareFunction: function(windowA, windowB)
    {
        return windowA.get_title().toLowerCase() > windowB.get_title().toLowerCase();
    },

    buildWindowList: function() {
    	let totalWorkspaces = global.screen.n_workspaces;
    	let that = this;
	    for (let i = 0; i < totalWorkspaces; i++)
	    {
	        let activeWorkspace = global.screen.get_workspace_by_index(i);
	        activeWorkspace.list_windows().sort(this.sortWindowsCompareFunction).forEach(
	            function(window)
	            {
	            	if (!window.is_skip_taskbar()) {
		                that.menu.addAction(window.get_title(), function(event) {
		                	that.createZoomSurface(window);
		                });
		            }
	            }
	        );
	    }
    },

    _onOpenStateChanged: function(menu, open) {
    	if (open) {
    		this.destroyZoomSurface();
    		this.removeAllMenuItems();
    		this.buildWindowList();
    	}
    },

    createZoomSurface: function(window) {
    	log('Creating zoom surface for "'+window.get_title()+'".');
        this.zoomSurface = new St.BoxLayout({ style_class: "zoom-surface", vertical: true});

	    let geometry = global.screen.get_monitor_geometry(0);
        let surface = this.getClonedSurface(window, geometry.width, geometry.height);
        if (surface === null) {
        	log('Cannot create cloned surface!');
        	this.destroyZoomSurface();
        	return false;
        }
 		this.zoomSurface.add_actor(surface);

	    global.stage.add_actor(this.zoomSurface);
        this.zoomSurface.set_position(0, 0);
 	    
        return true;
    },

    destroyZoomSurface: function() {
    	if (this.zoomSurface !== null) {
    		this.zoomSurface.destroy();
            this.zoomSurface = null;
            MaximusFunc.decorate(this.currentWindow);
            let mutterWindow = this.currentWindow.get_compositor_private();
            if (mutterWindow) {
                mutterWindow.show();
            }
            this.currentWindow = null;
    	}
    },

    getClonedSurface: function(window, screenW, screenH) {
        this.currentWindow = window;
    	let surface = null;

    	let mutterWindow = window.get_compositor_private();
        if (mutterWindow)
        {
            window.focus(0);
            MaximusFunc.undecorate(window);
            mutterWindow.hide();
            let windowTexture = mutterWindow.get_texture();
            let [width, height] = windowTexture.get_size();

            let scale = Math.min(screenW / width, screenH / height);
            surface = new Clutter.Clone ({
                source: windowTexture,
                reactive: false /*true*/,
                width: width * scale,
                height: height * scale
            });
        }
    	return surface;
    }
});

function init() {
}

let fullScreenScaler;
function enable() {
    fullScreenScaler = new FullScreenScaler;
    Main.panel.addToStatusArea('FullScreenScaler', fullScreenScaler);
}

function disable() {
	fullScreenScaler.destroy();
}
