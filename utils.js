/*
  taken from https://github.com/Tudmotu/gnome-shell-extension-clipboard-indicator
*/

// Print objects... why no dev tools
function prettyPrint (name, obj, recurse, _indent) {
    let prefix = '';
    let indent = typeof _indent === 'number' ? _indent : 0;
    for (let i = 0; i < indent; i++) {
        prefix += '    ';
    }

    recurse = typeof recurse === 'boolean' ? recurse : true;
    if (typeof name !== 'string') {
        obj = arguments[0];
        recurse = arguments[1];
        _indent = arguments[2];
        name = obj.toString();
    }

    log(prefix + '--------------');
    log(prefix + name);
    log(prefix + '--------------');
    for (let k in obj) {
        if (typeof obj[k] === 'object' && recurse) {
            prettyPrint(name + '::' + k, obj[k], true, indent + 1);
        }
        else {
            log(prefix + k, typeof obj[k] === 'function' ? '[Func]' : obj[k]);
        }
    }
}
