function override(object, prop, replacer) { 
    var old = object[prop]; object[prop] = replacer(old)  
}

const unitZoom = {sx: 1.0, sy: 1.0, dx: 0.0, dy: 0.0};
function getZoom(boxes, element) {
    if (!element || !element.boxid) { return unitZoom; }
    let b = boxes[element.boxid];
    if (!b) { return unitZoom; }
    return {sx: b.sx, sy: b.sy, dx: b.x + b.dx, dy: b.y + b.dy};
}


function Behaviour(add, remove) {
    let b = {};
    b.add = add.bind(b);
    b.remove = remove.bind(b);
    b.set = function () { return b.remove().add(); };
    return b;
}

function EventResponder(element, eventname, handler) {
    return Behaviour(function add() {
        element.addEventListener(eventname, handler);
        return this;
    }, function remove() {
        element.removeEventListener(eventname, handler);
        return this;
    });
}

function download(data, type, name) {
    let blob = new Blob(data, {type: type});
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function telluser(text) {
    let pop = document.createElement('div');
    pop.innerHTML = text;
    pop.style.position = 'absolute';
    pop.style.right = '8pt';
    pop.style.bottom = '8pt';
    pop.style.padding = '4pt 8pt 4pt 8pt';
    pop.style['border-radius'] = '4pt';
    pop.style['box-shadow'] = '0px 0px 10px';
    document.body.appendChild(pop);
    setTimeout(function () {
        document.body.removeChild(pop);
    }, 5000);
}

const fileExtensions = {
    scheme: '.rkt', haskell: '.hs', c: '.c', cpp: '.cpp', sql: '.sql', 
    javascript: '.js', typescript: '.ts', python: '.py', julia: '.jl',
    ruby: '.rb', java: '.java',
};
const modeForExtension = {};
Object.keys(fileExtensions).forEach((mode) => {
    modeForExtension[fileExtensions[mode].substring(1)] = mode;
});
const elem = (id) => { return document.getElementById(id); };
const copy = (obj) => { return Object.assign({}, obj); };
const historyKey = (name) => { return name + '.history'; };
const languageKey = (name) => { return name + '.lang'; };
const urlfilename = () => {
    let p = new URLSearchParams(window.location.search);
    return (p.get("file") || window.location.hash.substring(1)).trim();
};
const filename = () => { 
    return (elem('filename').value.trim().replaceAll(/\s+/g, '') || urlfilename());
};
const language = () => {
    let p = new URLSearchParams(window.location.search);
    return p.get("lang") || window.localStorage[languageKey(filename())] || 'scheme';
};
const filepath = () => {
    return filename() + (fileExtensions[language()] || ".txt");
};
const redirect = (file,lang) => {
    file = file || filename();
    lang = lang || language();
    window.location.href = `?file=${file}&lang=${lang}`;
};

function init() {
    let canvas = elem('canvas');
    let id = 1;
    let boxes = {};
    let history = [];
    let redo = [];
    let EnlargeBehaviour = MkEnlargeBehaviour(canvas);

    elem('filename').value = urlfilename() || 'start';

    function getLatest(boxid, rewind = 0) {
        let endpt = history.length-1;
        console.assert(rewind >= 0 && rewind < history.length);

        for (let i = endpt - rewind; i >= 0; i--) {
            let block = history[i];
            if (block.type === 'modified') {
                for (let k = 0; k < block.items.length; k++) {
                    if (block.items[k].id === boxid) {
                        return block.items[k];
                    }
                }
            } else if (block.type === 'deleted') {
                for (let k = 0; k < block.items.length; k++) {
                    if (block.items[k].id === boxid) {
                        // No such block any more. Deleted.
                        return null;
                    }
                }
            }
        }
        return null;
    }

    function getCurrent(boxid) {
        return getLatest(boxid) || boxes[boxid];
    }

    function zoom(div, b) {
        let tx =  `translate(${b.dx}px,${b.dy}px) scale(${b.sx},${b.sy})`;
        div.style.transform = tx;
        div.style.left = `${b.x}px`;
        div.style.top = `${b.y}px`;
        div.style['transform-origin'] = 'top left';
        return b;
    }

    function later(func) {
        requestAnimationFrame(func);
    };

    function save(name, lang=null) {
        lang = lang || language();
        let historyBlock = [];
        for (let k in boxes) {
            let b = boxes[k];
            if (b) {
                let el = elem(b.elementId);
                if (el) {
                    let latest = getLatest(b.id);
                    let val = el.editor.getValue();
                    if (!latest
                        || val !== latest.content
                        || b.width !== latest.width
                        || b.height !== latest.height
                        || b.x !== latest.x
                        || b.y !== latest.y
                        || b.dx !== latest.dx
                        || b.dy !== latest.dy
                    ) {
                        let b2 = copy(b);
                        b2.version++;
                        b2.content = val;
                        b2.width = el.style.width;
                        b2.height = el.style.height;
                        b.version = b2.version;
                        b.content = val;
                        b.width = b2.width;
                        b.height = b2.height;
                        b.x = b2.x;
                        b.y = b2.y;
                        b.dx = b2.dx;
                        b.dy = b2.dy;
                        historyBlock.push(b2);
                    }
                }
            }
        }

        if (historyBlock.length > 0) {
            history.push({type: 'modified', items: historyBlock});
        }

        if (!name) {
            window.location.href = `?file=start&lang=${lang}`;
            return;
        }

        window.localStorage[name] = JSON.stringify(boxes);
        window.localStorage[historyKey(name)] = JSON.stringify(history);
        window.localStorage[languageKey(name)] = lang;
        if (historyBlock.length > 0) {
            telluser(`Saved <b>${name}</b> in language <code>${lang}</code>`);
        }
    }

    function loadBoxes(name) {
        if (name in window.localStorage) {
            let str = window.localStorage[name];
            boxes = JSON.parse(str);
            for (let k in boxes) {
                createBox(boxes[k], boxes);
                id = Math.max(boxes[k].id + 1, id);
            }
        }
        if (historyKey(name) in window.localStorage) {
            history = JSON.parse(window.localStorage[historyKey(name)]);
        } else {
            history = [];
        }

        // Set the next available id to not overlap with
        // ids used earlier ... and include even deleted
        // items when determining that.
        for (let i = 0; i < history.length; i++) {
            let h = history[i];
            for (let j = 0; j < h.items.length; j++) {
                id = Math.max(h.items[j].id + 1, id);
            }
        }
    }

    function MkEnlargeBehaviour(canvas) {
        let lastBigDiv = [];
        let addedToCanvas = 0;
        function resetSizes() {
            while (lastBigDiv.length > 0) {
                let d = lastBigDiv.pop();
                let b2 = boxes[d.boxid];
                if (b2) {
                    b2.sx = 1.0;
                    b2.sy = 1.0;
                    zoom(d, b2);
                }
            }
        }
        return function (div) {
            function onclick(event) {
                resetSizes();
                let b = boxes[div.boxid];
                if (b) {
                    b.sx = 1.5;
                    b.sy = 1.5;
                    zoom(div, b);
                    lastBigDiv.push(div);
                }
            }
            function onclickcanvas(event) {
                resetSizes();
                // Save every time the canvas background is clicked
                // as a state that is visible in its entirety.
                save(filename());
            }
            return Behaviour(function add() {
                div.addEventListener('click', onclick);
                if (addedToCanvas === 0) {
                    canvas.addEventListener('click', onclickcanvas);
                }
                ++addedToCanvas;
                return this;
            }, function remove() {
                div.removeEventListener('click', onclick);
                --addedToCanvas;
                if (addedToCanvas === 0) {
                    canvas.removeEventListener('click', onclickcanvas);
                }
                return this;
            });
        };
    }

    function DragBehaviour(div) {
        let dx = 0, dy = 0;
        let pointerId = null;
        function onpointerdown(event) {
            if (event.metaKey) {
                dx = boxes[div.boxid].dx;
                dy = boxes[div.boxid].dy;
                div.addEventListener('pointermove', onpointermove, true);
                div.addEventListener('pointerup', onpointerup, true);
                event.stopPropagation();
                if (div.setPointerCapture) {
                    pointerId = event.pointerId;
                    div.setPointerCapture(pointerId);
                }
                event.preventDefault();
            }
        }
        function onpointermove(event) {
            dx += event.movementX;
            dy += event.movementY;
            let b = div.codeBox();
            b.dx = dx;
            b.dy = dy;
            zoom(div, b);
            event.stopPropagation();
            event.preventDefault();
        }
        function onpointerup(event) {
            be.set();
            event.stopPropagation();
            if (pointerId && div.releasePointerCapture) {
                div.releasePointerCapture(pointerId);
                pointerId = null;
            }
            event.preventDefault();
        }
        let be = Behaviour(function add() { 
            div.addEventListener('pointerdown', onpointerdown, true);
            return this;
        }, function remove() {
            div.removeEventListener('pointerdown', onpointerdown, true);
            div.removeEventListener('pointermove', onpointermove, true);
            div.removeEventListener('pointerup', onpointerup, true);
            return this;
        });

        return be;
    }

    function CreateBoxBehaviour(canvas) {
        return EventResponder(canvas, 'click',
            function onclick(event) {
                if (event.metaKey) {
                    let boxid = id++;
                    createBox({
                        version: 1,
                        id: boxid,
                        elementId: 'tb' + boxid,
                        x: event.clientX,
                        y: event.clientY,
                        dx: 0,
                        dy: 0,
                        sx: 1.0,
                        sy: 1.0,
                        width: '25em',
                        height: '10em',
                        content: ""
                    });
                }
            });
    }

    function ClickBehaviour(div) {
        function onclick(event) {
            if (event.altKey) {
                let id = div.boxid;
                div.parentElement.removeChild(div);
                history.push({type: 'deleted', items: [copy(boxes[id])]});
                delete boxes[id];
            } else {
                div.focus();

                div.style['z-index'] = 5000;
                for (let k in boxes) {
                    let b = boxes[k];
                    let el = elem(b.elementId);
                    if (el && el !== div) {
                        el.style['z-index'] = b.id;
                    }
                }
            }
            event.stopPropagation();
        }

        return EventResponder(div, 'click', onclick);
    }

    function SaveBehaviour(div) {
        return EventResponder(div, 'click', function onsave(event) {
            save(filename());
            if (urlfilename().length === 0) {
                redirect();
            }
        });
    }

    function SourceCodeBehaviour(button) {
        // TODO: Change this to sort definitions in dependency order.
        // Currently it sorts top-down-first followed by left-right.
        return EventResponder(button, 'click', function onsource(event) {
            save(filename());
            let boxvals = [...Object.values(boxes)];
            boxvals.sort(function (a, b) {
                let diff = Math.round((a.x + a.dx - b.x - b.dx)/144);
                if (diff === 0) {
                    return Math.round((a.y + a.dy - b.y - b.dy)/90);
                } else {
                    return diff;
                }
            });
            let content = [];
            for (let b of boxvals) {
                content.push(b.content);
                content.push("\n\n");
            }
            download(content, "text/plain", filepath());
        });
    }

    function ExportBehaviour(button) {
        return EventResponder(button, 'click', function onexport(event) {
            save(filename());
            let data = {};
            data.date = (new Date()).toISOString();
            data.filename = filename();
            data.lang = window.localStorage[languageKey(filename())];
            data.boxes = JSON.parse(window.localStorage[filename()]);
            data.history = JSON.parse(window.localStorage[historyKey(filename())]);
            let dataStr = JSON.stringify(data);
            download([dataStr], 'application/json', filename() + ".json");
        });
    }

    function DropFileBehaviour(canvas) {
        function ondrop(event) {
            event.preventDefault();
            console.log(event.dataTransfer);
            let files = [...event.dataTransfer.files];
            if (files.length > 0) {
                let file = files[0];
                let parts = file.name.split(".");
                let ext = parts[parts.length-1];
                let filename = file.name.replaceAll('.', '_');
                if (ext.toLowerCase() === 'json') {
                    let fr = new FileReader();
                    fr.addEventListener('load', function () {
                        let json = JSON.parse(fr.result);
                        window.localStorage[json.filename] = JSON.stringify(json.boxes);
                        window.localStorage[json.filename + ".history"] = JSON.stringify(json.history);
                        window.localStorage[json.filename + ".lang"] = json.lang;
                        elem('filename').value = json.filename;
                        redirect();
                    });
                    fr.readAsText(file);
                } else {
                    let mode = modeForExtension[ext];
                    if (mode) {
                        let fr = new FileReader();
                        fr.addEventListener('load', function () {
                            let text = fr.result;
                            let boxid = id++;

                            createBox({
                                version: 1,
                                id: boxid,
                                elementId: 'tb' + boxid,
                                x: event.clientX,
                                y: event.clientY,
                                dx: 0,
                                dy: 0,
                                sx: 1.0,
                                sy: 1.0,
                                width: `${maxLineLength(text)}ex`,
                                height: `${Math.min(40, countLines(text))}em`,
                                content: text
                            });
                            save(filename, mode);
                            redirect(filename, mode);
                        });
                        fr.readAsText(file);
                    } else {
                        alert("Don't know what to do with file " + file.name);
                    }
                }
            }
        }
        function ondragover(event) {
            event.preventDefault();
        }
        return Behaviour(function add() {
            canvas.addEventListener('drop', ondrop);
            canvas.addEventListener('dragover', ondragover);
            return this;
        }, function remove() {
            canvas.removeEventListener('drop', ondrop);
            canvas.removeEventListener('dragover', ondragover);
            return this;
        });
    }

    function countLines(text) {
        return text.split("\n").length;
    }

    function maxLineLength(text) {
        let lines = text.split("\n");
        let lengths = lines.map((l) => l.length);
        return Math.max.apply(null, lengths);
    }

    // Pressing Cmd-B will take the currently selected text and
    // make a new box with it.
    function ExtractCodeBehaviour(div) {
        const cmdname = "extractSelectionIntoBox";
        return Behaviour(function add() {
            div.editor.commands.addCommand({
                name: cmdname,
                bindKey: {win: "Ctrl-B", mac: "Command-B"},
                exec: function (editor) {
                    let origbox = getCurrent(div.boxid);
                    let box = copy(origbox);
                    box.id = id++;
                    // New box is shifted to right of current box.
                    box.x += 150;
                    box.sx = 1.0;
                    box.sy = 1.0;
                    let sel = editor.getSelectedText();
                    // New box has enough height to hold the selected text,
                    // but has same width as the current box.
                    box.height = `${countLines(sel)}em`;
                    box.content = editor.getSelectedText();
                    createBox(box);
                }
            });
            return this;
        }, function remove() {
            div.editor.commands.removeCommand(cmdname);
            return this;
        });
    }

    function createBox(box) {
        let x = box.x, y = box.y;
        let dx = box.dx, dy = box.dy;
        let sx = box.sx, sy = box.sy;
        let div = document.createElement('div');
        let elementId = 'tb' + box.id;
        div.boxid = box.id;
        div.codeBox = () => boxes[box.id];
        div.setAttribute('class', 'textbox');
        div.setAttribute('id', elementId);
        div.style.position = "absolute";
        div.style.left = `${x}px`;
        div.style.top = `${y}px`;
        div.style.width = box.width;
        div.style.height = box.height;
        div.style.padding = "5pt";
        div.style.resize = "both";
        zoom(div, box);
        div.style['z-index'] = box.id;
        div.click_behaviour = ClickBehaviour(div).add();
        div.drag_behaviour = DragBehaviour(div).add();
        div.enlarge_behaviour = EnlargeBehaviour(div).add();
        boxes[box.id] = {
            version: box.version,
            id: box.id,
            elementId: elementId,
            x: box.x,
            y: box.y,
            dx: box.dx,
            dy: box.dy,
            sx: box.sx,
            sy: box.sy,
            width: box.width,
            height: box.height,
            content: box.content
        };
        canvas.appendChild(div);
        let editor = ace.edit(div);
        //editor.setTheme("ace/theme/monokai");
        editor.setTheme("ace/theme/xcode");
        editor.session.setMode(`ace/mode/${language()}`);
        editor.renderer.setShowGutter(false);
        editor.setValue(box.content);
        editor.clearSelection();
        div.editor = editor;
        div.extractcode_behaviour = ExtractCodeBehaviour(div).add();

        // Ace editor has a problem with boxes that have a css transform
        // setting on them. It doesn't manage to correctly compute the
        // text landing position. The fix below works in this context
        // where we only have translation and scale. In general we might
        // want to do a matrix transform application of the form M^{-1}XM
        //
        // Thanks to the suggestion here - 
        // https://github.com/ajaxorg/ace/issues/2475#issuecomment-364266978
        override(editor.renderer, "screenToTextCoordinates", function(old) {
            return function(x, y) {
                var zoom = getZoom(boxes, this.container);
                if (this.container.boxid) {
                    let b = boxes[this.container.boxid];
                    x = (x - zoom.dx) / zoom.sx + zoom.dx;
                    y = (y - zoom.dy) / zoom.sy + zoom.dy;
                } 
                return old.call(this, x, y);
            }
        })

        later(() => {
            div.click();
            editor.focus();
        });
    }


    let createbox_behaviour = CreateBoxBehaviour(elem('canvas')).add();
    let save_behaviour = SaveBehaviour(elem('save')).add();
    let source_behaviour = SourceCodeBehaviour(elem('source')).add();
    let export_behaviour = ExportBehaviour(elem('export')).add();
    let dropfile_behaviour = DropFileBehaviour(elem('canvas')).add();

    loadBoxes(filename());
}

init();
