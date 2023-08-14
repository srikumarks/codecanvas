Code canvas
===========

"Code canvas" is a tool inspired by a difficulty I encountered when teaching
implementation-intensive classes. I'd need to go back and forth between
definitions and implementations in different parts of the same file and I felt
that students would lose some orientation everytime such a code jump happened.

Usually, a slideable blackboard -- say, 6 boards -- is a better deal, but not
all classrooms were equipped with such a board.

So this is a tool that lets you put snippets of code on a blank "canvas", move
them around, jump around etc. while keeping the whole screen in view. The code
boxes support Scheme syntax.

Try it here - https://sriku.org/demos/codecanvas/

How to use
----------

1. Cmd-Click anywhere on the canvas to create a code box.

2. You can drag the code box around by Cmd-dragging its "title" bar.

3. You can resize the code box using the handle at the bottom right corner.

4. Alt-Click on a code box to delete the box.

5. Click on a code box to "focus" on it. The box will zoom a bit to make it
   visible, in case you're projecting the canvas on a smaller screen. Click on
   the canvas background to reset the box size to normal.

6. You can select some text within a box and press "Cmd-B" or "Ctrl-B" to make
   a new box with that selection. In Firefox, Cmd-B is bound to showing the bookmarks
   tab. So you can use "Ctrl-B" in FF.

7. You can load a source code file onto the canvas by dragging and dropping
   the file on it. Supports a few programming languages commonly used in 
   teaching. The mode of the canvas will change to reflect the language the
   file is in, as identified by its extension.

7. Any time you want to save what you have, click the "Save" button at the top
   right corner. The canvas will be saved in your ``localStorage``.

Notes
-----

There are two URL parameters - ``file`` and ``lang``. You can put in a name for
your canvas into the text box at the top right and click "Save" to store it in
``localStorage`` under that name. The ``lang`` parameter can be used to set the
editor language for the code boxes (examples ``scheme``, ``haskell``,
``javascript``, ``python``).

The "Source" button will combine all the box text into a single file and make
it available for download. The order in which the code is put together is
top-down first followed by left-right. While eventually we could integrate a
parser and sort the boxes by dependency order before building the source, you
may initially want to place definitions closer to top-left and things that use
these definitions either below or to the right.

The "Export" button will make a JSON object of all the information associated
with the current canvas and provide a file for download. You can later on take
this file and drop it onto the canvas to load it. This offers a way to transport
the canvas code to other computers, say, via email as an attachment.

.. [#lang] At some point, it might make sense to have per-box language support,
   but I don't need it right now, so I don't intend to do that in the interest
   of keeping things simple.

