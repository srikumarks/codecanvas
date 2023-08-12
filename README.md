# Code canvas

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

## How to use

1. Click "Save" first. It will reload the page with a query param
   ``?file=start``. The page's ``file`` query parameter is used to save your
   canvas. If you already loaded a page with a filename, you don't need to click
   "Save".

2. Cmd-Click anywhere on the canvas to create a code box.

3. You can drag the code box around by Cmd-dragging its "title" bar.

4. You can resize the code box using the handle at the bottom right corner.

5. Alt-Click on a code box to delete the box.

6. Click on a code box to "focus" on it. The box will zoom a bit to make it
   visible, in case you're projecting the canvas on a smaller screen. Click on
   the canvas background to reset the box size to normal.

7. Any time you want to save what you have, click the "Save" button at the top
   right corner. The canvas will be saved in your ``localStorage``.

## Notes

The "Export" button will combine all the box text into a single file and make
it available for download. The order in which the code is put together is
top-down first followed by left-right. While eventually we could integrate a
parser and sort the boxes by dependency order before exporting, you may
initially want to place definitions closer to top-left and things that use
these definitions either below or to the right.

