document.title = 'Piratpartiets Webbchat';

window.xmpp_room = "piratpartiet@chat.piratpartiet.se";
window.xmpp_bosh = "/http-bind";
window.xmpp_srv  = "anon.piratechat.net";

var muc_login_local_adjustments = function()
	{
	    document.getElementById('what-name').innerHTML = 'Vilket namn vill du anv&auml;nda i chatten?';
	    document.getElementById('name-colon').innerHTML = 'Namn:';
	    document.getElementById('join').value = 'G\u00e5 in';
	    window.muc_placeholder = 'skriv ditt meddelande här och tryck enter';
	}

addLoader("load", muc_login_local_adjustments);
