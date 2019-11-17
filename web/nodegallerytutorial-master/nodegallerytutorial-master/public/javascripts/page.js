jQuery(document).ready(function(){
	Galleria.loadTheme('/galleria/themes/classic/galleria.classic.min.js');
	Galleria.run('.galleria');
});
function getcube(){
var number=document.getElementById("number").value;
alert(number*number*number);
console.log(number);
}
var openFile = function(file) {
    var input = file.target;

    var reader = new FileReader();
    reader.onload = function(){
      var dataURL = reader.result;
      var output = document.getElementById('output');
      output.src = dataURL;
    };
    reader.readAsDataURL(input.files[0]);
  };