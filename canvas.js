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

function message(text) {
    let pop = document.createElement('div');
    pop.innerHTML = text;
    pop.style.position = 'absolute';
    pop.style.right = "5px";
    pop.style.bottom = "5px";
    pop.style['box-shadow'] = '3px 3px 5px';
    document.body.appendChild(pop);
    setTimeout(5000, function () {
        document.body.removeChild(pop);
    });
}

const fileExtensions = {
    scheme: '.rkt', haskell: '.hs', c: '.c', cpp: '.cpp', sql: '.sql', 
    javascript: '.js', typescript: '.ts', python: '.py', julia: '.jl',
    ruby: '.rb'
};
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
const redirect = () => {
    window.location.href = `?file=${filename()}&lang=${language()}`;
};

function init() {
    let canvas = elem('canvas');
    let id = 1;
    let boxes = {};
    let history = [];
    let redo = [];
    let EnlargeBehaviour = MkEnlargeBehaviour(canvas);

    elem('filename').value = urlfilename() || 'start';

    function getLatest(boxid) {
        for (let i = history.length-1; i >= 0; i--) {
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
        return boxes[boxid];
    }


    function setTransform(div, b) {
        div.style.transform = `translate(${b.dx}px,${b.dy}px) scale(${b.sx},${b.sy})`;
        div.style['transform-origin'] = 'top left';
        return b;
    }

    function later(func) {
        requestAnimationFrame(func);
    };

    function save(name) {
        let historyBlock = [];
        for (let k in boxes) {
            let b = boxes[k];
            if (b) {
                let el = elem(b.elementId);
                if (el) {
                    let latest = getLatest(b.id);
                    let val = el.editor.getValue();
                    if (val !== latest.content
                        || b.width !== latest.width
                        || b.height !== latest.height
                        || b.x !== latest.x
                        || b.y !== latest.y
                        || b.dx !== latest.dx
                        || b.dy !== latest.dy
                    ) {
                        let b2 = copy(latest);
                        b2.version++;
                        b2.content = val;
                        b2.width = el.style.width;
                        b2.height = el.style.height;
                        historyBlock.push(b2);
                        b.version = b2.version;
                        b.content = val;
                        b.width = b2.width;
                        b.height = b2.height;
                    }
                }
            }
        }

        if (historyBlock.length > 0) {
            history.push({type: 'modified', items: historyBlock});
        }

        if (!name) {
            window.location.href = "?file=start&lang=scheme";
            return;
        }

        window.localStorage[name] = JSON.stringify(boxes);
        window.localStorage[historyKey(name)] = JSON.stringify(history);
        window.localStorage[languageKey(name)] = language();
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
        let lastBigDiv = null;
        let addedToCanvas = 0;
        return function (div) {
            function onclick(event) {
                let b = boxes[div.boxid];
                b.sx = 1.5;
                b.sy = 1.5;
                setTransform(div, b);
                if (lastBigDiv && lastBigDiv !== div) {
                    let b2 = boxes[lastBigDiv.boxid];
                    b2.sx = 1.0;
                    b2.sy = 1.0;
                    setTransform(lastBigDiv, b2);
                    lastBigDiv = div;
                }
                if (!lastBigDiv) {
                    lastBigDiv = div;
                }
            }
            function onclickcanvas(event) {
                if (lastBigDiv) {
                    let b = boxes[lastBigDiv.boxid];
                    b.sx = 1.0;
                    b.sy = 1.0;
                    setTransform(lastBigDiv, b);
                    lastBigDiv = null;
                }
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
        function onmousedown(event) {
            if (event.metaKey) {
                dx = boxes[div.boxid].dx;
                dy = boxes[div.boxid].dy;
                div.addEventListener('mousemove', onmousemove);
                div.addEventListener('mouseup', onmouseup);
                event.stopPropagation();
            }
        }
        function onmousemove(event) {
            dx += event.movementX;
            dy += event.movementY;
            let b = boxes[div.boxid];
            b.dx = dx;
            b.dy = dy;
            later(() => {
                setTransform(div, b);
            });
            event.stopPropagation();
        }
        function onmouseup(event) {
            be.set();
            event.stopPropagation();
        }
        let be = Behaviour(function add() { 
            div.addEventListener('mousedown', onmousedown);
            return this;
        }, function remove() {
            div.removeEventListener('mousedown', onmousedown);
            div.removeEventListener('mousemove', onmousemove);
            div.removeEventListener('mouseup', onmouseup);
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
            if (urlfilename().length > 0) {
                redirect();
            }
            message(`Saved ${filename()} in language ${language()}`);
        });
    }

    function SourceCodeBehaviour(button) {
        // TODO: Change this to sort definitions in dependency order.
        // Currently it sorts top-down-first followed by left-right.
        return EventResponder(button, 'click', function onsource(event) {
            save(filename());
            let boxvals = [...Object.values(boxes)];
            boxvals.sort(function (a, b) {
                return (a.y + a.dy < b.y + b.dy) && (a.x + a.dx < b.x + b.dx);
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

    function createBox(box) {
        let x = box.x, y = box.y;
        let dx = box.dx, dy = box.dy;
        let sx = box.sx, sy = box.sy;
        let div = document.createElement('div');
        div.boxid = box.id;
        div.setAttribute('class', 'textbox');
        div.setAttribute('id', box.elementId);
        div.style.position = "absolute";
        div.style.left = `${x}px`;
        div.style.top = `${y}px`;
        div.style.width = box.width;
        div.style.height = box.height;
        div.style.padding = "5pt";
        div.style.resize = "both";
        div.style.draggable = true;
        setTransform(div, box);
        div.style['z-index'] = box.id;
        div.click_behaviour = ClickBehaviour(div).add();
        div.drag_behaviour = DragBehaviour(div).add();
        div.enlarge_behaviour = EnlargeBehaviour(div).add();
        boxes[box.id] = {
            version: box.version,
            id: box.id,
            elementId: box.elementId,
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
