
function create_muc_handler(conn, jid, nick, options)
{
	if(typeof(options) == "undefined" || !options)
		options = {};
	
	var muc = { conn: conn, jid: jid, nick: nick, options: options,
		send_message: function (text) { conn.send($msg({to: jid, type: 'groupchat'}).c('body').t(text).tree()); },
		occupants: {} };
	
	if(options.handle_join)
		conn.addHandler(new_join_handler(muc, options.handle_join), null, "presence", null, null, null);
		
	if(options.handle_leave)
		conn.addHandler(new_leave_handler(muc, options.handle_leave), null, "presence", null, null, null);
		
	if(options.handle_status)
	{
		// This one is called internally, so we need to store a reference to it
		muc.status_handler = new_status_handler(muc, options.handle_status);
		conn.addHandler(muc.status_handler, null, "presence", null, null, null);
	}
		
	if(options.handle_history)
		conn.addHandler(new_history_handler(muc, options.handle_history), null, "message", "groupchat", null, null);

	if(options.handle_message)
		conn.addHandler(new_message_handler(muc, options.handle_message), null, "message", "groupchat", null, null);

	if(options.handle_error)
		conn.addHandler(new_error_handler(muc, options.handle_error), null, "presence", "error", null, null);
	
	muc.set_status = function (status, text, history)
	{
		var pres = $pres({to: jid+'/'+nick});
		if(status && status != "online")
			pres.c("show").t(status).up();
		if(text)
			pres.c("status").t(text).up();
		if(history)
			pres.c("x", { "xmlns":"http://jabber.org/protocol/muc" }).c("history", history).up().up();
		conn.send(pres.tree());
	};

	muc.set_status("online", null, { "maxstanzas": 30 }); //TODO: make this time dependent or similar. See http://xmpp.org/extensions/xep-0045.html#example-34
	
	return muc;
}

function new_join_handler(muc, callback)
{
	return function (stanza)
	{
		var nick = Strophe.getResourceFromJid(stanza.getAttribute("from"));
		if(stanza.getAttribute("type") != "unavailable" && stanza.getAttribute("type") != "error"
		     && Strophe.getBareJidFromJid(stanza.getAttribute("from")) == muc.jid)
			if(!muc.occupants[nick])
			{
				var text = stanza.getElementsByTagName("status")[0];
				if(text) text = Strophe.getText(text);
				muc.occupants[nick] = {};
				callback(stanza, muc, nick, text);
				if(muc.status_handler)
				{
					muc.status_handler(stanza);
				}
			}
		return true;
	};
}

function new_leave_handler(muc, callback)
{
	return function (stanza)
	{
		var nick = Strophe.getResourceFromJid(stanza.getAttribute("from"));
		if(stanza.getAttribute("type") == "unavailable" && Strophe.getBareJidFromJid(stanza.getAttribute("from")) == muc.jid)
			if(muc.occupants[nick])
			{
				var text = stanza.getElementsByTagName("status")[0];
				if(text) text = Strophe.getText(text);
				callback(stanza, muc, nick, text);
				muc.occupants[nick] = null;
			}
		return true;
	};
}

function new_message_handler(muc, callback)
{
	return function (stanza)
	{
		if(stanza.getAttribute("type") == "groupchat" && Strophe.getBareJidFromJid(stanza.getAttribute("from")) == muc.jid)
		{
			var body = stanza.getElementsByTagName("body");
			if(body.length > 0 && stanza.getElementsByTagName("delay").length == 0)
				callback(stanza, muc, Strophe.getResourceFromJid(stanza.getAttribute("from")), Strophe.getText(body[0]));
		}
		return true;
	};
}

function new_history_handler(muc, callback)
{
	return function (stanza)
	{
		if(stanza.getAttribute("type") == "groupchat" && Strophe.getBareJidFromJid(stanza.getAttribute("from")) == muc.jid)
		{
			var body = stanza.getElementsByTagName("body");
			if(body.length > 0 && stanza.getElementsByTagName("delay").length > 0)
				callback(stanza, muc, Strophe.getResourceFromJid(stanza.getAttribute("from")), Strophe.getText(body[0]));
		}
		return true;
	};
}

function new_error_handler(muc, callback)
{
	return function (stanza)
	{
		if(Strophe.getBareJidFromJid(stanza.getAttribute("from")) == muc.jid)
		{
			var e = stanza.getElementsByTagName("error");
			if(e.length > 0)
			{
				var err = null;
				Strophe.forEachChild(e[0], null, function (child)
					{
						if(child.getAttribute("xmlns") == "urn:ietf:params:xml:ns:xmpp-stanzas")
							err = child.nodeName;
					});
				callback(stanza, muc, err);
			}
		}
		return true;
	};
}

function new_status_handler(muc, callback)
{
	return function (stanza)
        {
                var nick = Strophe.getResourceFromJid(stanza.getAttribute("from"));
                if(stanza.getAttribute("type") != "unavailable" && stanza.getAttribute("type") != "error"
                     && Strophe.getBareJidFromJid(stanza.getAttribute("from")) == muc.jid)
                        if(muc.occupants[nick])
                        {
                                var status = stanza.getElementsByTagName("show")[0];
                                var text = stanza.getElementsByTagName("status")[0];
                                if(!status)
                                	status = "online";
                                else
                                	status = Strophe.getText(status);
				if(text) text = Strophe.getText(text);
				if(status != muc.occupants[nick].status ||
				   text != muc.occupants[nick].status_text)
				{
					muc.occupants[nick].status = status;
					muc.occupants[nick].status_text = text;
                                	callback(stanza, muc, nick, status, text);
                                }
                        }
                return true;
        };
}
