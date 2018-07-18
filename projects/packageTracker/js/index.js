$(function(){
	$("#test").click(function(){
		$(".test").modal('show');
	});
	$(".test").modal({
		closable: true
	});
});

//ui massive button blue create_btn
$('.rapid.example .ui.massive.button')
  .on('click', function() {
    var
      $progress       = $('.rapid.example .ui.progress'),
      $button         = $(this),
      updateEvent
    ;
    // restart to zero
    clearInterval(window.fakeProgress)
    $progress.progress('reset');
     // updates every 10ms until complete
    window.fakeProgress = setInterval(function() {
      $progress.progress('increment');
      $button.text( $progress.progress('get value') );
      // stop incrementing when complete
      if($progress.progress('is complete')) {
        clearInterval(window.fakeProgress)
      }
    }, 10);
  })
;
$('.rapid.example .ui.progress')
  .progress({
    duration : 200,
    total    : 200,
    text     : {
      active: '{value} of {total} done'
    }
  })
;