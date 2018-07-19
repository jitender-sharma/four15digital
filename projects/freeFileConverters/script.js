;(function(window, document, undefined){
  'use strict';

  var formData = {meta:{}}

  var MOCK_ID = formData.meta.mockId;
  var EXPOTASK_URL = 'http://'+formData.meta.host;
  // var DEV_EXPOTASK = 'http://expotask-dev.adotube.com';
  var FILE_UPLOAD_URL = '/cs/api/adunit/vdxdisplay/html5/uploadMedia/'+MOCK_ID+'?outputFileName=';
  var SAVE_API = '/cs/api/adunit/vdxdisplay/html5/config/'+MOCK_ID;
  var CLEANUP_API = '/cs/api/adunit/vdxdisplay/html5/'+MOCK_ID+'/temp';
  var DOWNLOAD_ASSETS_URL='/cs/downloadassetsV2?mockId='+MOCK_ID;
  var DOWNLOAD_RAW_ASSETS_URL='/cs/downloadrawassets?mockId='+MOCK_ID;
  var FILETYPE_NOT_SUPPORTED = 'File not supported';
  var SERVER_EXCEPTION = 'Server exception';

  var FETCH_LANGUAGE_JSON = '/cs/static/html/vdxHTML/VDX-Lang.json';

  var REMOVE_BRANDING = '2';
  var CUSTOM_BRANDING = '1';
  var DEFAULT_BRANDING = '0';

  var DEFAULT_BRANDING_VALUE = 'VDX BY EXPONENTIAL';

  var fileUploadCounter = 0;

  var selectedTeaserSizes = [];
  var selectedTeaserLogo='';
  var selectedMainUnit = '';
  function addSectionInAccordionFor(size){
    var $accordion = $('.ui.accordion');
    selectedTeaserSizes.push(size);
      $accordion.removeClass('hidden');
    var $title = $('.ui.accordion .title[data-title="'+size+'"]');
    var $content = $('.ui.accordion .content[data-content="'+size+'"]');
      $title.removeClass('hidden');
      $content.removeClass('hidden');
    var accordionIndex = $title.attr('data-index');
    $accordion.accordion('open', Number(accordionIndex));
  }

  function removeSectionInAccordionFor(size){
    var $accordion = $('.ui.accordion');
    var index = selectedTeaserSizes.indexOf(size);
    selectedTeaserSizes.splice(index, 1);

    var $title = $('.ui.accordion .title[data-title="'+size+'"]');
    var $content = $('.ui.accordion .content[data-content="'+size+'"]');

    var accordionIndex = $title.attr('data-index');
    $accordion.accordion('close', Number(accordionIndex));

    $title.addClass('hidden');
    $content.addClass('hidden');

    $title.removeClass('ss_error_accordion');
    $content.find('.error').removeClass('error');
    var emptyObject = {
      x:'',y:'',scaledWidth:'',scaledHeight:''
    };
    $('.ui.accordion .content[data-content="'+size+'"] .form').form('set values',emptyObject);

    if(!$accordion.hasClass('hidden')&&selectedTeaserSizes.length === 0){
      $accordion.addClass('hidden');
    }
  }

  function teaserSelectionChange(){
    var element = this;
    var size = element.getAttribute('data');
    if(element.checked){
      addSectionInAccordionFor(size);
      if(selectedTeaserSizes.length === 1){
        var $error = $('#submitBtn').parent().find('.ss_error.label');
        $error.addClass('hidden');
      }
    }else {
      removeSectionInAccordionFor(size);
    }

    //Make UI dirty
    updateUIStateDirty();
  }

  function convertValuesToNumber(data) {
    var modifiedObject = {};
    for (var key in data) {
      if (data.hasOwnProperty(key)) {
        modifiedObject[key] = Number(data[key]);
      }
    }

    return modifiedObject;
  }

  var loadLanguage = function (defaultLanguage) {
    $.ajax({
      url: FETCH_LANGUAGE_JSON,
      dataType: 'json',
      cache: true,
      success: function (data) {
        var languages = data.locales;
        var languageArray = Object.keys(languages);
        var optionHTMLStr = '';
        for (var key in languageArray) {
          var languageDisplayText = languages[languageArray[key]].name;
          if (languages[languageArray[key]].country) {
            languageDisplayText += ' - ' + languages[languageArray[key]].country
          }
          optionHTMLStr += '<div class="item" data-text="' + languageDisplayText + '" data-value="' + languageArray[key] + '">' + languageDisplayText + '</div>'
        }

        $('#languageDropDown>div.menu').html(optionHTMLStr);
        $('#languageDropDown').dropdown('refresh');

        $('#languageDropDown').dropdown('set selected', defaultLanguage)

      }.bind(this),
      error: function (xhr, status, err) {
        console.error(status, err.toString());
      }.bind(this)
    });
  };

  function createFinalDataObj() {
    var brandingTxt;
    var logoExt = '.'+selectedTeaserLogo.split('.').pop();
    var selectedBrandingOption = $('#enableBranding .ui.dropdown').dropdown('get value');

    if(selectedBrandingOption === DEFAULT_BRANDING){
      brandingTxt = DEFAULT_BRANDING_VALUE;
    }else if(selectedBrandingOption === CUSTOM_BRANDING){
      brandingTxt = $('#brandingTxt >input[type="text"]').val().trim();
    }else if(selectedBrandingOption === REMOVE_BRANDING){
      brandingTxt = '';
    }else{
      brandingTxt = DEFAULT_BRANDING_VALUE;
    }

    var formData = {meta:{}}

    var data = {
      "defaults":{
         "parameters":{
            "language":formData.meta.language,
            "branding":brandingTxt
         }
      },
      "teaser":{
         "execution":{
            "display":{
              "logo": 'teaserlogo'+logoExt
            }
          }
        }
    };
    selectedTeaserSizes.forEach(function(size){
      var sizeData = $('.ui.accordion .content[data-content="'+size+'"] .form').form('get values');

      var modifiedData;
      if(sizeData.constructor.name === "Array"){
        modifiedData = sizeData.map(function(data){
          return convertValuesToNumber(data);
        });
      }else {
        modifiedData = convertValuesToNumber(sizeData);
      }

      if(size==='970x250'){
        data.teaser.execution.display[size] = {"standard":{video:modifiedData[0]}, "collapsed":{video:modifiedData[1]}};
      }else {
        data.teaser.execution.display[size] = {"standard":{video:modifiedData}};
      }
    });
    console.log(data);
    return data;
  }

  function handleSubmit (evt){
    evt.preventDefault();
    clearAllMessages();
    var isError = false;
    if(!selectedTeaserLogo){
      isError = true;
      console.error('teaser logo is not uploaded!!!');
      showUploadMessage(0, 'logo', 'Please upload teaser logo image file.');
    }

    if(!selectedMainUnit){
      isError = true;
      console.error('Main unit is not uploaded!!!');
      showUploadMessage(0, 'mainunit', 'Please upload main unit zip file.');
    }

    if(selectedTeaserSizes.length!==0){
      selectedTeaserSizes.forEach(function(size){
        var isFormValid = $('.ui.accordion .content[data-content="'+size+'"] .form').form('is valid');
        if(typeof isFormValid === 'boolean' && !isFormValid){
          console.error('Please fill appropriate values for '+size);
          showAccordionMessage(0,size);
          isError =  true;
        }else if(isFormValid.constructor.name === 'Array'){
          var flag = isFormValid.filter(function(status){
            return !status;
          }).length>0;
          if(flag){
            console.error('Please fill appropriate values for '+size);
            showAccordionMessage(0,size);
            isError =  true;
          }
        }
      });
    }else{
      console.error('At least one size should be selected!!!');
      showSubmitMessage(0, 'Select at least one teaser size to build ad unit.');
      isError =  true;
    }

    if(!isValidCustomBranding()){
      isError = true;
    }

    if(!isError){
      formData.data = createFinalDataObj();
      saveDataToServer();
    }
  }

  function isValidCustomBranding(){
    var isCustomBrandingEnabled = $('#enableBranding .ui.dropdown').dropdown('get value') === CUSTOM_BRANDING;
    var brandingText = $('#brandingTxt input[type="text"]').val();

    if(isCustomBrandingEnabled && !brandingText){
      showBrandingError(true);
      return false;
    }else{
      showBrandingError(false);
      return true;
    }
  }

  function showBrandingError(flag){
    if(flag){
      $('#brandingTxt').parent().addClass('error');
      $('#brandingError').text('Enter custom branding text');
      $('#brandingError').removeClass('hidden');
    }else{
      $('#brandingError').text('');
      $('#brandingError').addClass('hidden');
      $('#brandingTxt').parent().removeClass('error');
    }
  }

  function clearAllMessages() {
    var $success = $('#submitBtn').parent().find('.green.label');
    var $error = $('#submitBtn').parent().find('.ss_error.label');
    var $titles = $('.ui.accordion .title');

    $success.addClass('hidden');
    $error.addClass('hidden');
    $titles.removeClass('ss_error_accordion');
  }

  function updateUIStateDirty(){
    var $success = $('#submitBtn').parent().find('.green.label');
    var $error = $('#submitBtn').parent().find('.ss_error.label');
    var $downloadBtn = $('#downloadBtn');
    var $finishBtn = $('#finishBtn');
    var $submitBtn = $('#submitBtn');

    $success.addClass('hidden');
    $error.addClass('hidden');
    $downloadBtn.addClass('hidden');
    $finishBtn.addClass('hidden');
    if(fileUploadCounter === 0){
      $submitBtn.removeClass('disabled');
    }
  }

  function showSubmitMessage(flag, message) {
    var $success = $('#submitBtn').parent().find('.green.label');
    var $error = $('#submitBtn').parent().find('.ss_error.label');
    if(flag){
      //success
      $error.addClass('hidden');
      $success.removeClass('hidden');
      $success.text(message);
    }else {
      //Fail
      $error.removeClass('hidden');
      $success.addClass('hidden');
      $error.text(message);
    }

  }

  function showUploadMessage(flag, fileType, message) {
    var $error = $('input[data-filetype="'+fileType+'"]').parent().parent().find('.ss_error.label');
    var $actionBtn = $('input[data-filetype="'+fileType+'"]').parent().find('button');
    var $componentField = $('input[data-filetype="'+fileType+'"]').parent().parent();
    if(flag){
      //All good
      $actionBtn.removeClass('red');
      $actionBtn.removeClass('loading');
      $actionBtn.removeClass('yellow');
      $actionBtn.addClass('green');
      $componentField.removeClass('error');
      $error.addClass('hidden');
      $error.text('');
    }else {
      //Show error
      $actionBtn.removeClass('green');
      $actionBtn.removeClass('loading');
      $actionBtn.removeClass('yellow');
      $actionBtn.addClass('red');
      $componentField.addClass('error');
      $error.removeClass('hidden');
      $error.text(message);
    }

    $('input[data-filetype="'+fileType+'"]').parent().removeClass('disabled');
  }

  function showAccordionMessage(flag, size) {
    var $title = $('.ui.accordion .title[data-title="'+size+'"]');
    if(flag){
      $title.removeClass('ss_error_accordion');
    }else {
      $title.addClass('ss_error_accordion');
    }
  }

  function saveDataToServer(){
    if(!formData.misc){
      formData.misc = {};
    }

    if(selectedTeaserLogo){
      formData.misc.logo = selectedTeaserLogo;
    }

    if(selectedMainUnit){
      formData.misc.mainunit = selectedMainUnit;
    }

    $('#downloadBtn').addClass('hidden');
    $('#finishBtn').addClass('hidden');
    console.log('Final form data ', formData);
    $('#submitBtn').addClass('loading');
    $.ajax({
      method: 'POST',
      url: SAVE_API,
      //		   data: formData,
      data: JSON.stringify(formData),
      dataType: 'text',
      contentType: 'application/json',
      success: function (data) {
        console.log("JSON sent successfully.");
        $('#submitBtn').removeClass('loading');
        $('#submitBtn').addClass('disabled');
        showSubmitMessage(1,'Assets are generated successfully');
        $('#downloadBtn').attr('href', DOWNLOAD_ASSETS_URL);
        $('#downloadBtn').removeClass('hidden');
        $('#finishBtn').removeClass('hidden');
      },
      error:function(){
        console.error("Error sending data to server");
        $('#submitBtn').removeClass('loading');
        showSubmitMessage(0, 'Something went wrong. Please contact administrator');
      }
    });
  }

  function handleDownload() {

  }

  function handleFinish (){
    $('#finishBtn').addClass('loading');
    $.ajax({
      method: 'DELETE',
      url: CLEANUP_API,
      dataType: 'text',
      contentType: 'application/json',
      success: function (data) {
        console.log("JSON sent successfully.");
        var data = new Object();
        data.mockId = MOCK_ID;
        data.creativeRequestId = formData.meta.creativeRequestId;
        data.adsize = formData.meta.adsize;
        data.comments = '';
        data.action = 'finish';
        data.landing = formData.meta.landing;
        data.language = formData.meta.language;
        data.finalizedAdSizes = selectedTeaserSizes;
        data.metaInfo = JSON.stringify({
          "productType": 13,
          "productName": formData.meta.product,
          "version": '1.0'
        });
        //    "{\"productType\":9,\"productName\":\"VDXBlended\",\"version\":\"1.9\"}";
        console.log(data);
        // var targetOrigin='';
        // if(window.location.host === 'cstudio.exponential.com'){
        //    targetOrigin = PROD_EXPOTASK;
        // }else {
        //   targetOrigin = DEV_EXPOTASK;
        // }
        var status = window.top.postMessage(JSON.stringify(data), EXPOTASK_URL);
        console.log("Post message status: ", status);

        $('#finishBtn').removeClass('loading');
      },
      error:function(){
        console.error("Error sending data to server");
        $('#finishBtn').removeClass('loading');
      }
    });
  }

  function initiateFileUpload(event){
    console.log('Upload is initiated');
    var fileElement = $(event.target).parent().find('input[type="file"]');
    fileElement.get(0).click();
    console.log(fileElement.attr('accept'));
  }

  function inProgressCallback($file) {
    console.log('Upload is in progress');
    console.log($file);
    var $actionBtn = $file.parent().find('button');
    $actionBtn.removeClass('red');
    $actionBtn.removeClass('green');
    $actionBtn.addClass('loading');
    $actionBtn.addClass('yellow');
    $file.parent().addClass('disabled');
    var fileType = $file.attr('data-filetype');
    $file.parent().parent().removeClass('error');

    //Increase counter
    fileUploadCounter++;
    //Clear messages
    updateUIStateDirty();
    //disable submit button
    $('#submitBtn').addClass('disabled');
    // showUploadMessage(1, fileType);
  }

  function successCallback($file) {
    console.log('Upload is success');
    console.log($file);

    var fileType = $file.attr('data-filetype');
    var fileName = $file.get(0).files[0].name;
    showUploadMessage(1, fileType);
    if( fileType === 'logo'){
      selectedTeaserLogo = fileName;
    }else if (fileType === 'mainunit') {
      selectedMainUnit = fileName;
    }
    $file.parent().removeClass('disabled');
    //Reduce file upload counter
    fileUploadCounter--;
    if(fileUploadCounter===0){
      //Enable sumit button
      $('#submitBtn').removeClass('disabled');
    }
    //clear file selection
    $file.val('');
    if($('#rawDownloadBtn').hasClass('hidden')){
      //Show download raw asset button
      $('#rawDownloadBtn').attr('href', DOWNLOAD_RAW_ASSETS_URL);
      $('#rawDownloadBtn').removeClass('hidden');
    }
  }

  function failCallback($file, messageType) {
    console.log('Upload is failed');
    console.log($file);

    var fileType = $file.attr('data-filetype');
    var supportedFileType = fileType === 'mainunit'?'.zip':'.png,.jpg,.jpeg';
    if(messageType === FILETYPE_NOT_SUPPORTED){
      showUploadMessage(0, fileType, 'Please upload supported file format ( i.e. '+supportedFileType+' )');
    }else if (messageType === SERVER_EXCEPTION){
      fileUploadCounter--;
      showUploadMessage(0, fileType, 'Upload failed. Please try again.');
    }
    //Enable submit button
    $('#submitBtn').removeClass('disabled');
    //clear file selection
    $file.val('');
  }

  function handleFileSelectionChange(event) {
    var file = event.target.files[0];
    var $file = $(event.target);
    var supportedFileType = $file.attr('accept').split(',');
    var selectedFileExt = '.'+file.name.split('.').pop();
    $file.parent().find('input[type="text"]').get(0).value = file.name;
    if(supportedFileType.indexOf(selectedFileExt.toLowerCase())=== -1){
      //Not supported extension
      failCallback($file, FILETYPE_NOT_SUPPORTED);
    }else {
      var fileExt = '.'+file.name.split('.').pop();
      var outputFileName = ($file.attr('data-filetype') === 'mainunit'?'mainunit':'teaserlogo') + fileExt;

      fileUpload.upload(FILE_UPLOAD_URL+outputFileName, file, inProgressCallback.bind(null, $file), successCallback.bind(null, $file), failCallback.bind(null, $file, SERVER_EXCEPTION));
    }
  }

  function onChangeInForm(event) {
    //Make UI dirty
    updateUIStateDirty();
  }

  function populateUI(data, misc){
    //custom branding is available
    var brandingTxt = data.defaults.parameters.branding;
    if(brandingTxt=== DEFAULT_BRANDING_VALUE){
      //Default Branding
      $('#enableBranding .ui.dropdown').dropdown('set selected', DEFAULT_BRANDING);
    }else if(brandingTxt === ''){
      //Remove Branding
      $('#enableBranding .ui.dropdown').dropdown('set selected', REMOVE_BRANDING);
      $('#brandingTxt').parent().addClass('hidden');
    }else{
      //Custom Branding
      $('#enableBranding .ui.dropdown').dropdown('set selected', CUSTOM_BRANDING);
      $('#brandingTxt >input[type="text"]').val(brandingTxt);
      $('#brandingTxt').removeClass('disabled');
      $('#customBrandingMsg').removeClass('hidden');
    }

    //Show download raw asset button
    $('#rawDownloadBtn').attr('href', DOWNLOAD_RAW_ASSETS_URL);
    $('#rawDownloadBtn').removeClass('hidden');
    //main unit upload
    $('input[data-filetype="mainunit"]').parent().find('input[type="text"]').val(misc.mainunit);
    selectedMainUnit = misc.mainunit;
    $('input[data-filetype="mainunit"]').parent().find('button').addClass('green');
    //teaser logo upload
    $('input[data-filetype="logo"]').parent().find('input[type="text"]').val(misc.logo);
    selectedTeaserLogo = misc.logo;
    $('input[data-filetype="logo"]').parent().find('button').addClass('green');
    // teaser sizes
    var displayData = data.teaser.execution.display;
    for (var key in displayData) {
      if (displayData.hasOwnProperty(key) && key !== 'logo') {
        $('input[type="checkbox"][data="'+key+'"]').parent().checkbox('check');
        addSectionInAccordionFor(key);
        var $formEle = $('.ui.accordion .content[data-content="'+key+'"] .form');
        if(key==='970x250'){
          $($formEle[0]).form('set values',displayData[key].standard.video);
          $($formEle[1]).form('set values',displayData[key].collapsed.video);
        }else {
          $formEle.form('set values',displayData[key].standard.video);
        }
      }
    }
  }

  function brandingOptionChange(value, text, $choice){
    $('#customBrandingMsg').addClass('hidden');
    if(value === DEFAULT_BRANDING){
      //Default branding
      $('#brandingTxt').parent().removeClass('hidden');
      $('#brandingTxt input[type="text"]').val('');
      $('#brandingTxt').addClass('disabled');
    }else if(value === CUSTOM_BRANDING){
      //Custom Branding
      $('#brandingTxt').parent().removeClass('hidden');
      $('#brandingTxt').removeClass('disabled');
      $('#brandingTxt input[type="text"]').focus();
      $('#customBrandingMsg').removeClass('hidden');
    }else if(value === REMOVE_BRANDING){
      //Remove Branding
      $('#brandingTxt').parent().addClass('hidden');
      $('#customBrandingMsg').removeClass('hidden');
    }
    //Make UI dirty
    updateUIStateDirty();
    showBrandingError(false);
  }

  function onBrandingChange(){
    isValidCustomBranding();
    updateUIStateDirty();
  }

  function DOMReady() {
    $('#sizeSelectionForm .ui.checkbox').checkbox({
      onChange: teaserSelectionChange
    });

    $('#enableBranding .ui.dropdown').dropdown({
      onChange: brandingOptionChange
    });

    $('.ui.accordion').accordion();
    $('.ui.accordion .content[data-content="970x250"] .menu .item').tab();

    $('.action.input button, .action.input input[type="text"]').on('click', initiateFileUpload)
    $('.action.input').delegate('input[type="file"]', 'change', handleFileSelectionChange);

    $('.ui.accordion .form').form({
      fields:{
        x:['empty', 'number'],
        y:['empty', 'number'],
        scaledWidth:['empty', 'number'],
        scaledHeight:['empty', 'number']
      }
    });

    $('#brandingTxt input[type="text"]').on('keyup', onBrandingChange);
    $('.ui.accordion .form').on('change', onChangeInForm);

    $('#submitBtn').on('click', handleSubmit);
    $('#finishBtn').on('click', handleFinish);
    $('#downloadBtn').on('click', handleDownload);

    loadLanguage(formData.meta.language || 'en-us');
  }

  if(formData.data){
    //Populate UI in edit mode
    populateUI(formData.data, formData.misc);
  }

  $(document).ready(DOMReady);
})(window, document);
