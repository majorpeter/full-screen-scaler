/**
 * @file maximus_functions.js
 * @note these functions have been taken from maximus extension's source
 * @url https://bitbucket.org/mathematicalcoffee/maximus-gnome-shell-extension
 */

const Util = imports.misc.util;
const Meta = imports.gi.Meta;

function LOG(msg) {
    //log(msg);
}

/** Guesses the X ID of a window.
 *
 * It is often in the window's title, being `"0x%x %10s".format(XID, window.title)`.
 * (See `mutter/src/core/window-props.c`).
 *
 * If we couldn't find it there, we use `win`'s actor, `win.get_compositor_private()`.
 * The actor's `x-window` property is the X ID of the window *actor*'s frame
 * (as opposed to the window itself).
 *
 * However, the child window of the window actor is the window itself, so by
 * using `xwininfo -children -id [actor's XID]` we can attempt to deduce the
 * window's X ID.
 *
 * It is not always foolproof, but works good enough for now.
 *
 * @param {Meta.Window} win - the window to guess the XID of. You wil get better
 * success if the window's actor (`win.get_compositor_private()`) exists.
 */
function guessWindowXID(win) {
    let id = null;
    /* if window title has non-utf8 characters, get_description() complains
     * "Failed to convert UTF-8 string to JS string: Invalid byte sequence in conversion input",
     * event though get_title() works.
     */
    try {
        id = win.get_description().match(/0x[0-9a-f]+/);
        if (id) {
            id = id[0];
            return id;
        }
    } catch (err) {
    }

    // use xwininfo, take first child.
    let act = win.get_compositor_private();
    if (act) {
        id = GLib.spawn_command_line_sync('xwininfo -children -id 0x%x'.format(act['x-window']));
        if (id[0]) {
            let str = id[1].toString();

            /* The X ID of the window is the one preceding the target window's title.
             * This is to handle cases where the window has no frame and so
             * act['x-window'] is actually the X ID we want, not the child.
             */
            let regexp = new RegExp('(0x[0-9a-f]+) +"%s"'.format(win.title));
            id = str.match(regexp);
            if (id) {
                return id[1];
            }

            /* Otherwise, just grab the child and hope for the best */
            id = str.split(/child(?:ren)?:/)[1].match(/0x[0-9a-f]+/);
            if (id) {
                return id[0];
            }
        }
    }
    // debugging for when people find bugs..
    log("[maximus]: Could not find XID for window with title %s".format(win.title));
    return null;
}

/** Undecorates a window.
 *
 * If I use set_decorations(0) from within the GNOME shell extension (i.e.
 *  from within the compositor process), the window dies.
 * If I use the same code but use `gjs` to run it, the window undecorates
 *  properly.
 *
 * Hence I have to make some sort of external call to do the undecoration.
 * I could use 'gjs' on a javascript file (and I'm pretty sure this is installed
 *  with GNOME-shell too), but I decided to use a system call to xprop and set
 *  the window's `_MOTIF_WM_HINTS` property to ask for undecoration.
 *
 * We can use xprop using the window's title to identify the window, but
 *  prefer to use the window's X ID (in case the title changes, or there are
 *  multiple windows with the same title).
 *
 * The Meta.Window object does *not* have a way to access a window's XID.
 * However, the window's description seems to have it.
 * Alternatively, a window's actor's 'x-window' property returns the XID
 *  of the window *frame*, and so if we parse `xwininfo -children -id [frame_id]`
 *  we can extract the child XID being the one we want.
 *
 * See here for xprop usage for undecoration:
 * http://xrunhprof.wordpress.com/2009/04/13/removing-decorations-in-metacity/
 *
 * @param {Meta.Window} win - window to undecorate.
 */
function undecorate(win) {
    /* Undecorate with xprop */
    let id = guessWindowXID(win),
        cmd = ['xprop', '-id', id,
               '-f', '_MOTIF_WM_HINTS', '32c',
               '-set', '_MOTIF_WM_HINTS',
                '0x2, 0x0, 0x0, 0x0, 0x0'];
    /* _MOTIF_WM_HINTS: see MwmUtil.h from OpenMotif source (cvs.openmotif.org),
     *  or rudimentary documentation here:
     * http://odl.sysworks.biz/disk$cddoc04sep11/decw$book/d3b0aa63.p264.decw$book
     *
     * Struct { flags, functions, decorations, input_mode, status }.
     * Flags: what the hints are for. (functions, decorations, input mode and/or status).
     * Functions: minimize, maximize, close, ...
     * Decorations: title, border, all, none, ...
     * Input Mode: modeless, application modal, system model, ..
     * Status: tearoff window.
     */

    // fallback: if couldn't get id for some reason, use the window's name
    if (!id) {
        cmd[1] = '-name';
        cmd[2] = win.get_title();
    }
    LOG(cmd.join(' '));
    Util.spawn(cmd);
    // #25: when undecorating a Qt app (texmaker, keepassx) somehow focus is lost.
    // However, is there a use case where this would happen legitimately?
    // For some reaons the Qt apps seem to take a while to be refocused.
    Meta.later_add(Meta.LaterType.IDLE, function () {
        if (win.focus) {
            win.focus(global.get_current_time());
        } else {
            win.activate(global.get_current_time());
        }
    });
}

/** Decorates a window by setting its `_MOTIF_WM_HINTS` property to ask for
 * decoration.
 *
 * @param {Meta.Window} win - window to undecorate.
 */
function decorate(win) {
    /* Decorate with xprop: 1 == DECOR_ALL */
    let id = guessWindowXID(win),
        cmd = ['xprop', '-id', id,
               '-f', '_MOTIF_WM_HINTS', '32c',
               '-set', '_MOTIF_WM_HINTS',
                '0x2, 0x0, 0x1, 0x0, 0x0'];
    // fallback: if couldn't get id for some reason, use the window's name
    if (!id) {
        cmd[1] = '-name';
        cmd[2] = win.get_title();
    }
    LOG(cmd.join(' '));
    Util.spawn(cmd);
    // #25: when undecorating a Qt app (texmaker, keepassx) somehow focus is lost.
    // However, is there a use case where this would happen legitimately?
    // For some reaons the Qt apps seem to take a while to be refocused.
    Meta.later_add(Meta.LaterType.IDLE, function () {
        if (win.focus) {
            win.focus(global.get_current_time());
        } else {
            win.activate(global.get_current_time());
        }
    });
}
