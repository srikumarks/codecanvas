all: .done
.done: readme.rst canvas.js index.html
	s3cmd -P put $? s3://sriku.org/demos/codecanvas/
	touch .done
