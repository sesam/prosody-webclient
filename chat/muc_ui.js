function create_muc_ui(conn, jid, nick, options)
{
	if(!conn)
		return false;
	
	var muc;
	var handlers = {};
	
	var roster = null;
	
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
			
			var html = "<span class='muc-join'><span class='muc-nick'>" + htmlescape(nick) + "</span>" + " has joined" + (text?(" ("+htmlescape(text)+")"):"") + "</span><br/>\n";
			if(window.linkify)
				html = linkify(html);
			options.message_log.innerHTML += html;
			options.message_log.scrollTop = options.message_log.scrollHeight;
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
			
			var html = "<span class='muc-leave'><span class='muc-nick'>" + htmlescape(nick) + "</span>" + " has left" + (text?(" ("+htmlescape(text)+")"):"") + "</span><br/>\n";
			if(window.linkify)
				html = linkify(html);
			options.message_log.innerHTML += html;
			options.message_log.scrollTop = options.message_log.scrollHeight; 
		}
		
		var action_pattern = /^\/me[ ']/;
		
		handlers.handle_message = function (stanza, muc, nick, message)
		{
			var html;
			if(message.match(action_pattern))
				html = "<span class='muc-message muc-action'><span class='muc-nick'>* " + htmlescape(nick) + "</span>" + " " + htmlescape(message.substring(4)) + "</span><br/>\n";
			else
				html = "<span class='muc-message'><span class='muc-nick'>" + htmlescape(nick) + "</span>" + ": " + htmlescape(message) + "</span><br/>\n";
			
			if(window.linkify)
				html = linkify(html);
			options.message_log.innerHTML += html;
			options.message_log.scrollTop = options.message_log.scrollHeight;
			if(options.detect_focus)
			{
				muc.unread_messages++;
				document.title = " ("+muc.unread_messages+") " + original_title;
			}
		}
				
		handlers.handle_history = function (stanza, muc, nick, message)
		{
			var html;
			if(message.match(action_pattern))
				html = "<span class='muc-history muc-action'><span class='muc-nick'>* " + htmlescape(nick) + "</span>" + " " + htmlescape(message.substring(4)) + "</span><br/>\n";
			else
				html = "<span class='muc-history'><span class='muc-nick'>" + htmlescape(nick) + "</span>" + ": " + htmlescape(message) + "</span><br/>\n";
			
			if(window.linkify)
				html = linkify(html);
			options.message_log.innerHTML += html;
			options.message_log.scrollTop = options.message_log.scrollHeight; 
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

			if(code == 13 && input_box.value.length > 0)
			{
				muc.send_message(input_box.value);
				input_box.value = '';
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
	
		var window_focused = true;
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
			else if(window_focused)
			{
				window_focused = false;
				away_timeout = window.setTimeout(function () {
					away_flag = true;
					muc.set_status("away", "Window not active");
				}, 15000);
			}
		}

		function handle_focus()
		{
			if(!window_focused)
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
				window_focused = true;
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
}

function htmlescape(s)
{
	return s.replace(/&/g,'&amp;').                                         
                replace(/>/g,'&gt;').                                           
                replace(/</g,'&lt;').                                           
                replace(/"/g,'&quot;');
}
