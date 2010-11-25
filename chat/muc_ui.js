function addLoader(which,f)
{
	if(window.addEventListener) // W3C standard
	{
		window.addEventListener(which, f, false);
	}
	else if(window.attachEvent) // Microsoft
	{
		window.attachEvent('on'+which, f);  //works for onload, onunload, onbeforeunload
	}
}

function create_muc_ui(conn, jid, nick, options)
{
	if(!conn)
		return false;
	
	var muc = {}; //make muc an object from the start. Needed by muc.window_focused focus tracking.
	var handlers = {};
	
	var roster = null;
	
	action_pattern = new RegExp("^\/me[ ']");
		
	window.get_timestamp = function() { var d=new Date(), mm=d.getMinutes(); return d.getHours()+':'+(mm<10?'0'+mm:mm); }

	var get_message = function (nick, message, timestamp, klass)
		{
			if(message.match(action_pattern))
			{
				klass += ' muc-action';
				message = message.substring(4);
			}

			var html = "<div class='"+klass+"'><span class='muc-timestamp'>" + timestamp + " </span><span class='muc-nick'>" + htmlescape(nick) + "</span>" + ": " + htmlescape(message) + "</div>\n";

			if(window.linkify)
				html = linkify(html);
			return html;
		}

		print_message = function (nick, message, timestamp, klass)
		{
			options.message_log.innerHTML += get_message(nick, message, timestamp, klass);
			//if(options.message_log.scrollHeight - options.message_log.scrollTop <=100) //only scroll down automatically when the screen is currently near the bottom, i.e. not reading backlog. (Feature or bug, you decide, this 100px criteria also makes auto-scrolling stop if some 5+ line chat message is received, and you'll have to scroll past it yourself to get the automatic scrolling going again.)
				options.message_log.scrollTop = options.message_log.scrollHeight;
		}


	if(options.occupant_list)
		roster = options.occupant_list;
	
	if(options.message_log)
	{
		handlers.handle_join = function (stanza, muc, nick, text)
		{
			if(roster)
			{
				var rosteritem = document.createElement("div");
				rosteritem.setAttribute("class", "rosteritem");
				rosteritem.innerHTML = "<span class='statusindicator'>&bull;</span>&nbsp;<span>" + htmlescape(nick) + "</span>";
				var nicks = roster.childNodes;
				var added = false;
				for (var i = 0;i<nicks.length;i++)
				{
					if(nicks[i].nodeType == 1)
					{
						var thisnick = nicks[i].childNodes[2].childNodes[0].nodeValue;
						if(thisnick.toLowerCase() > nick.toLowerCase())
						{
							roster.insertBefore(rosteritem, nicks[i]);
							added = true;
							break;
						}
					}
				}
				if(!added)
					roster.appendChild(rosteritem);
				muc.occupants[nick].rosteritem = rosteritem;
			}
			
			print_message(nick, " has joined" + (text?(" ("+htmlescape(text)+")"):""), get_timestamp(), 'muc-join');
		}
		
		var statusmap = { online: "Available", away: "Away", xa: "Not available", dnd: "Busy", chat: "Free for a chat" };
		handlers.handle_status = function (stanza, muc, nick, status, text)
		{
			if(roster)
			{
				muc.occupants[nick].rosteritem.setAttribute("class", "rosteritem status"+status);
				muc.occupants[nick].rosteritem.setAttribute("className", "rosteritem status"+status);
				muc.occupants[nick].rosteritem.setAttribute("title", text||statusmap[status]);
			}
		}

		handlers.handle_leave = function (stanza, muc, nick, text)
		{
			if(roster)
			{
				roster.removeChild(muc.occupants[nick].rosteritem);
				muc.occupants[nick].rosteritem = null;
			}
			
			print_message(nick, " has left" + (text?(" ("+htmlescape(text)+")"):""), get_timestamp(), 'muc-leave');
		}
		
		handlers.handle_message = function (stanza, muc, nick, message)
		{
			print_message(nick, message, get_timestamp(), 'muc-message');
			
			if(options.detect_focus && !muc.window_focused)
			{
				muc.unread_messages++;
				document.title = " ("+muc.unread_messages+") " + original_title;
			}
		}
				
		handlers.handle_history = function (stanza, muc, nick, message)
		{
			print_message(nick, message, get_timestamp(), 'muc-history');
		}
	}
	
	handlers.handle_error = function (stanza, muc, error)
	{
		if(error == "conflict")
		{
			alert("The nickname you chose is already in use, please choose another one");
			window.location.reload();
		}
	}


	if(options.input_box)
	{
		var input_box = options.input_box;
		// For tab completion
		var word_before_cursor_pattern = /\w*$/;
		var complete_marker = null;
		var complete_candidates = null;
		var complete_current_candidate = 0;
		
		input_box.onkeydown = function (e)
		{
			var code = window.event?window.event.keyCode:e.which;
			var msg = input_box.value;
			muc.unread_messages = 0;

			if(code == 13 && msg.length > 0)
			{
				if(msg.charAt(0)!="/" || msg.match(action_pattern))
				{
					muc.send_message(input_box.value);
					input_box.value = '';
				}
				else if (msg.substring(0,5)=='/quit')
				{
					conn.disconnect();
				}
				else if (!muc.hide_slash_warning)
				{
					alert("Notice: /commands are not supported. If this means nothing to you, just press enter again and your message will be sent, including the beginning / and sorry to bother you!");
					muc.hide_slash_warning = true;
				}
				return false;
			}
			else if(code == 9 && options.tab_completion)
			{
				var cursor_pos = input_box.selectionStart;
				if(typeof(cursor_pos) == "undefined")
				{
					cursor_pos = input_box.value.length;
					if(input_box.createTextRange)
					{
						var caret = document.selection.createRange().duplicate();
						while(caret.parentElement() == input_box && caret.move("character", 1) == 1)
							cursor_pos--;
					}
				}

				if(complete_marker == null)
				{
					var text_before_cursor = input_box.value.substring(0, cursor_pos);
					var text_to_complete = text_before_cursor.match(word_before_cursor_pattern)[0].toLowerCase();
					complete_marker = (cursor_pos - text_to_complete.length);
					
					complete_candidates = [];
					for(var nick in muc.occupants)
					{
						if(nick.toLowerCase().indexOf(text_to_complete) == 0 && nick != muc.nick)
						{
							complete_candidates.push(nick);
						}
					}
					complete_current_candidate = 0;
				}
				else
				{
					//text_to_complete = text_before_cursor.substring(complete_marker, text_before_cursor.length-2);
					complete_current_candidate++;
					if(complete_current_candidate >= complete_candidates.length)
						complete_current_candidate = 0;
				}
				
				if(complete_candidates.length > 0)
				{
					var complete_with = complete_candidates[complete_current_candidate];
					input_box.value = input_box.value.substring(0, complete_marker) + complete_with + ", " + input_box.value.substring(cursor_pos);
				}
				
				return false;
			}
			else if(complete_marker != null)
			{
				complete_marker = null;
				complete_candidates = null;
			}
			return true;
		}
		
		if(options.send_button)
		{
			options.send_button.onclick = function ()
			{
				input_box.onkeypress({which: 13});
			}
		}
	}
	else
		alert("no input");
	
	if(options.detect_focus)
	{
		var original_title = document.title;
	
		muc.window_focused = true;
		var active_element = document.activeElement;
		
		var away_timeout = null;
		var away_flag = false;
		
		function handle_blur()
		{
			if(active_element != document.activeElement)
			{
				active_element = document.activeElement;
				return;
			}
			else if(muc.window_focused)
			{
				muc.window_focused = false;
				away_timeout = window.setTimeout(function () {
					away_flag = true;
					muc.set_status("away", "Window not active");
				}, 15000);
			}
		}

		function handle_focus()
		{
			if(!muc.window_focused)
			{
				muc.unread_messages = 0;
				document.title = original_title;
				if(away_flag)
				{
					away_flag = false;
					muc.set_status("online");
				}
				else if(away_timeout)
				{
					window.clearTimeout(away_timeout);
					away_timeout = null;
				}
				muc.window_focused = true;
			}
		}
		
		if (navigator.appName == "Microsoft Internet Explorer")
		{
			document.onfocusout = handle_blur;
			document.onfocusin = handle_focus;
		}
		else
		{
			window.onblur = handle_blur;
			window.onfocus = handle_focus;
		}
	}
	
	muc = create_muc_handler(conn, jid, nick, handlers);
	muc.unread_messages = 0;
	muc.window_focused = true;
	muc.hide_slash_warning = false;

	window.muc=muc;
	return muc;
}

function htmlescape(s)
{
	return s.replace(/&/g,'&amp;').                                         
                replace(/>/g,'&gt;').                                           
                replace(/</g,'&lt;').                                           
                replace(/"/g,'&quot;');
}
