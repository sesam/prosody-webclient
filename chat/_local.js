document.title = 'Piratpartiets Webbchat';

window.room = "test@conference.prosody.im";
window.bosh = "/bosh";


addEventListener('load', function()
	{
	    document.getElementById('what-name').innerHTML = 'Vilket namn vill du anv&auml;nda i chatten?';
	    document.getElementById('name-colon').innerHTML = 'Namn:';
	    document.getElementById('join').value = 'G\u00e5 in';
	});
