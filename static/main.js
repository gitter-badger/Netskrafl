/*

   Main.js
   Client-side script for main.html, the main page

   Author: Vilhjalmur Thorsteinsson, 2015

*/

var entityMap = {
   "&": "&amp;",
   "<": "&lt;",
   ">": "&gt;",
   '"': '&quot;',
   "'": '&#39;',
   "/": '&#x2F;'
};

function escapeHtml(string) {
   /* Utility function to properly encode a string into HTML */
   return String(string).replace(/[&<>"'\/]/g, function (s) {
      return entityMap[s];
   });
}

function nullFunc(json) {
   /* Null placeholder function to use for Ajax queries that don't need a success func */
}

function errFunc(xhr, status, errorThrown) {
   /* Error handling function for Ajax communications */
   // alert("Villa í netsamskiptum");
   console.log("Error: " + errorThrown);
   console.log("Status: " + status);
   console.dir(xhr);
}

function serverQuery(requestUrl, jsonData, successFunc) {
   /* Wraps a simple, standard Ajax request to the server */
   $.ajax({
      // The URL for the request
      url: requestUrl,

      // The data to send
      data: jsonData,

      // Whether this is a POST or GET request
      type: "POST",

      // The type of data we expect back
      dataType : "json",

      cache: false,

      // Code to run if the request succeeds;
      // the response is passed to the function
      success: (!successFunc) ? nullFunc : successFunc,

      // Code to run if the request fails; the raw request and
      // status codes are passed to the function
      error: errFunc,

      // code to run regardless of success or failure
      complete: function(xhr, status) {
      }
   });
}

function buttonOver(elem) {
   /* Show a hover effect on a button */
   if (!$(elem).hasClass("disabled"))
      $(elem).toggleClass("over", true);
}

function buttonOut(elem) {
   /* Hide a hover effect on a button */
   $(elem).toggleClass("over", false);
}

function markFavorite(elem, uid) {
   /* Toggle a favorite mark for the indicated user */
   var action;
   if ($(elem).hasClass("glyphicon-star-empty")) {
      $(elem).removeClass("glyphicon-star-empty");
      $(elem).addClass("glyphicon-star");
      action = "add";
   }
   else {
      $(elem).removeClass("glyphicon-star");
      $(elem).addClass("glyphicon-star-empty");
      action = "delete";
   }
   serverQuery("/favorite",
      {
         // Identify the relation in question
         destuser: uid,
         action: action
      }, null); // No success func needed - it's a one-way notification
}

function updateChallenges(json) {
   /* Coming back from an update of challeges:
      refresh the challenge list */
   refreshChallengeList();
}

function markChallenge(ev) {
   /* Change the state of a challenge upon a click on a challenge icon */
   var action;
   var elem = ev.delegateTarget;
   if ($(elem).hasClass("glyphicon-thumbs-down")) {
      /* A challenge from another user is being declined */
      action = "decline";
   }
   else
   if ($(elem).hasClass("grayed")) {
      /* A challenge is being issued to another user */
      action = "issue";
   }
   else {
      /* A challenge to another user is being retracted */
      $(elem).addClass("grayed");
      action = "retract";
   }
   if (action == "issue") {
      if (ev.data.userid.indexOf("robot-") === 0) {
         /* Challenging a robot: Create a new game and display it right away */
         window.location.href = newgameUrl(ev.data.userid, false);
         return;
      }
      /* New challenge: show dialog */
      showChallenge(elem.id, ev.data.userid, ev.data.nick, ev.data.fullname);
   }
   else
      serverQuery("/challenge",
         {
            // Identify the relation in question
            destuser: ev.data.userid,
            action: action
         }, updateChallenges
      );
}

function showUserInfo(ev) {
   /* Show the user information dialog */
   $("#usr-info-nick").text(ev.data.nick);
   $("#usr-info-fullname").text(ev.data.fullname);
   $("#usr-info-dialog").css("visibility", "visible");
   // Populate the #usr-recent DIV
   serverQuery("/recentlist",
      {
         user: ev.data.userid,
         count: 40 // Limit recent game count to 40
      },
      populateUserInfo);
}

function hideUserInfo(ev) {
   /* Hide the user information dialog */
   $("#usr-info-dialog").css("visibility", "hidden");
   $("#usr-recent").html("");
}

// Is a user list request already in progress?
var ulRq = false;

function populateUserList(json) {
   /* Display a user list that has been returned from the server */
   // Hide the user load spinner
   $("#user-load").css("display", "none");
   ulRq = false; // Allow another user list request to proceed
   if (!json || json.result === undefined)
      return;
   if (json.result !== 0)
      /* Probably out of sync or login required */
      /* !!! TBD: Add error reporting here */
      return;
   for (var i = 0; i < json.userlist.length; i++) {
      var item = json.userlist[i];
      // Robot userids start with 'robot-'
      var isRobot = item.userid.indexOf("robot-") === 0;
      var fav;
      if (isRobot)
         // Can't favorite a robot
         fav = "<span class='glyphicon glyphicon-star-empty'></span>";
      else
         fav = "<span title='Uppáhald' class='glyphicon glyphicon-star" +
         ((!item.fav) ? "-empty" : "") +
         "' onclick='markFavorite(this, \"" + item.userid + "\")'></span>";
      var chId = "chall" + i.toString();
      var ch = "<span title='Skora á' class='glyphicon glyphicon-hand-right" +
         (item.chall ? "'" : " grayed'") +
         " id='" + chId + "'></span>";
      var nick = escapeHtml(item.nick);
      var alink = "", aclose = "", info = "";
      if (isRobot) {
         // Mark robots with a cog icon
         nick = "<span class='glyphicon glyphicon-cog'></span>&nbsp;" + nick;
         // Put a hyperlink on the robot name and description
         alink = "<a href='" + newgameUrl(item.userid, false) + "'>";
         aclose = "</a>";
      }
      else {
         // Create a link to access user info
         info = "<span id='usr" + i.toString() + "' class='usr-info'></span>";
      }
      if (info.length)
         info = "<span class='list-info'>" + info + "</span>";
      var str = "<div class='listitem " + ((i % 2 === 0) ? "oddlist" : "evenlist") + "'>" +
         "<span class='list-ch'>" + ch + "</span>" +
         "<span class='list-fav'>" + fav + "</span>" +
         alink +
         "<span class='list-nick'>" + nick + "</span>" +
         "<span class='list-fullname'>" + escapeHtml(item.fullname) + "</span>" +
         aclose +
         info +
         "</div>";
      $("#userlist").append(str);
      // Associate a click handler with the info button, if present
      if (info.length)
         $("#usr" + i.toString()).click(
            { userid: item.userid, nick: item.nick, fullname: item.fullname },
            showUserInfo
         );
      // Associate a click handler with the challenge icon
      $("#" + chId).click(
         { userid: item.userid, nick: item.nick, fullname: item.fullname },
         markChallenge
      );
   }
}

// What range of users was last displayed, in case we need to refresh?
var displayedUserRange = null;

function redisplayUserList() {
   /* Redisplay the user list that is being shown */
   if (displayedUserRange !== null)
      refreshUserList({ data: displayedUserRange });
}

function periodicUserList() {
   /* This function gets called at regular intervals to
      refresh the list of live (connected) users, if
      that list is selected */
   if (displayedUserRange && (displayedUserRange == "live")) {
      refreshUserList({ data: "live" });
   }
}

function refreshUserList(ev) {
   /* Erase existing user list and issue a request to the server for a new one */
   if (ulRq)
      // A user list request is already in progress: avoid race condition
      return;
   ulRq = true; // Set to false again in populateUserList()
   /* Erase existing user list, if any */
   $("#userlist").html("");
   /* Indicate which subtab is being shown */
   if (ev.delegateTarget) {
      $("div.user-cat span").removeClass("shown");
      $(ev.delegateTarget).addClass("shown");
   }
   /* Show the user load spinner */
   $("#user-load").css("display", "block");
   /* Establish the alphabet range that we want to display */
   var range = ev.data + "";
   var fromRange = null;
   var toRange = null;
   /* Note the last displayed range in case we need to redisplay */
   displayedUserRange = range + "";
   if (range == "fav" || range == "robots" || range == "live") {
      /* Special requests: list of favorites, live users or robots */
      fromRange = range;
   }
   else {
      fromRange = range ? range.charAt(0) : null;
      toRange = fromRange;
      if (range && (range.length == 3))
         /* Range has x-y format */
         toRange = range.charAt(2);
   }
   // Hide the user info button header if listing the robots
   $("#usr-list-info").css("visibility", (range == "robots") ? "hidden" : "visible");
   serverQuery("/userlist",
      {
         // Identify the game in question
         from: fromRange,
         to: toRange
      },
      populateUserList);
}

function populateGameList(json) {
   if (!json || json.result === undefined)
      return;
   if (json.result !== 0)
      /* Probably out of sync or login required */
      /* !!! TBD: Add error reporting here */
      return;
   var numGames = json.gamelist.length;
   var numMyTurns = 0;
   for (var i = 0; i < numGames; i++) {
      var item = json.gamelist[i];
      var opp = escapeHtml(item.opp);
      if (item.opp_is_robot)
         // Mark robots with a cog icon
         opp = "<span class='glyphicon glyphicon-cog'></span>&nbsp;" + opp;
      var turnText = item.my_turn ? "Þú átt leik" : (opp + " á leik");
      var myTurn = "<span title='" + turnText + "' class='glyphicon glyphicon-flag" +
         (item.my_turn ? "" : " grayed") + "'></span>";
      var myWin = "<span class='glyphicon glyphicon-bookmark" +
         (item.sc0 >= item.sc1 ? "" : " grayed") + "'></span>";
      var str = "<div class='listitem " + ((i % 2 === 0) ? "oddlist" : "evenlist") + "'>" +
         "<a href='" + item.url + "'>" +
         "<span class='list-myturn'>" + myTurn + "</span>" +
         "<span class='list-ts'>" + item.ts + "</span>" +
         "<span class='list-opp'>" + opp + "</span>" +
         "<span class='list-win'>" + myWin + "</span>" +
         "<span class='list-s0'>" + item.sc0 + "</span>" +
         "<span class='list-colon'>:</span>" +
         "<span class='list-s1'>" + item.sc1 + "</span>" +
         "</a></div>";
      $("#gamelist").append(str);
      if (item.my_turn)
         numMyTurns++;
   }
   // Update the count of games where it's this user's turn
   if (numMyTurns === 0) {
      $("#numgames").css("display", "none");
      document.title = "Netskrafl";
   }
   else {
      $("#numgames").css("display", "inline-block").text(numMyTurns.toString());
      document.title = "(" + numMyTurns.toString() + ") Netskrafl";
   }
   if (numGames === 0) {
      // No games in the list: Display a hint to select an opponent
      $("div.hint").css("display", "block");
   }
   else {
      // Hide the hint
      $("div.hint").css("display", "none");
   }
}

function refreshGameList() {
   /* Update list of active games for the current user */
   $("#gamelist").html("");
   serverQuery("/gamelist",
      {
         // No data to send with query - current user is implicit
      },
      populateGameList);
}

function populateRecentList(json) {
   /* Populate a list of recent games for the current user */
   _populateRecentList(json, "#recentlist");
}

function populateUserInfo(json) {
   /* Populate a game list for a user info dialog */
   _populateRecentList(json, "#usr-recent");
}

function _populateRecentList(json, listId) {
   /* Worker function to populate a list of recent games */
   if (!json || json.result === undefined)
      return;
   if (json.result !== 0)
      /* Probably out of sync or login required */
      /* !!! TBD: Add error reporting here */
      return;
   for (var i = 0; i < json.recentlist.length; i++) {
      var item = json.recentlist[i];
      var opp = escapeHtml(item.opp);
      if (item.opp_is_robot)
         // Mark robots with a cog icon
         opp = "<span class='glyphicon glyphicon-cog'></span>&nbsp;" + opp;
      // Show won games with a ribbon
      var myWin = "<span class='glyphicon glyphicon-bookmark" +
         (item.sc0 >= item.sc1 ? "" : " grayed") + "'></span>";
      // Format the game duration
      var duration = "";
      if (item.days || item.hours || item.minutes) {
         if (item.days > 1)
            duration = item.days.toString() + " dagar";
         else
         if (item.days == 1)
            duration = "1 dagur";
         if (item.hours > 0) {
            if (duration.length)
               duration += " og ";
            duration += item.hours.toString() + " klst";
         }
         if (item.days === 0) {
            if (duration.length)
               duration += " og ";
            if (item.minutes == 1)
               duration += "1 mínúta";
            else
               duration += item.minutes.toString() + " mínútur";
         }
      }
      var str = "<div class='listitem " + ((i % 2 === 0) ? "oddlist" : "evenlist") + "'>" +
         "<a href='" + item.url + "'>" +
         "<span class='list-win'>" + myWin + "</span>" +
         "<span class='list-ts'>" + item.ts_last_move + "</span>" +
         "<span class='list-opp'>" + opp + "</span>" +
         "<span class='list-s0'>" + item.sc0 + "</span>" +
         "<span class='list-colon'>:</span>" +
         "<span class='list-s1'>" + item.sc1 + "</span>" +
         "<span class='list-duration'>" + duration + "</span>" +
         "</a></div>";
      $(listId).append(str);
   }
}

function refreshRecentList() {
   /* Update list of recent games for the current user */
   $("#recentlist").html("");
   serverQuery("/recentlist",
      {
         // Current user is implicit
         count: 40
      },
      populateRecentList);
}

function acceptChallenge(ev) {
   /* Accept a previously issued challenge from the user in question */
   ev.preventDefault();
   var param = ev.data;
   var prefs = param.prefs;
   if (prefs !== undefined && prefs.duration !== undefined && prefs.duration > 0)
      /* Accepting a timed challenge: go to a wait page */
      window.location.href = waitUrl(param.userid);
   else
      /* Accepting a normal challenge: start a new game immediately */
      window.location.href = newgameUrl(param.userid, false);
}

function waitAccept(json) {
   /* Coming back from an opponent waiting query that was sent to the server */
   if (json && json.waiting)
      /* Create a new timed game. The true parameter indicates
         that the normal roles are reversed, i.e. here it is the
         original issuer of the challenge that is causing the new
         game to be created, not the challenged opponent */
      window.location.href = newgameUrl(json.userid, true);
   else {
      // The opponent is not ready
      $("#accept-status").html("Andstæðingurinn <strong><span id='accept-opp'></span></strong> er ekki reiðubúinn");
      $("#accept-opp").text($("#accept-nick").text());
      // We seem to have a reason to update the challenge list
      refreshChallengeList();
   }
}

function cancelAccept(ev) {
   /* Dismiss the acceptance dialog without creating a new game */
   $("#accept-dialog")
      .css("visibility", "hidden");
}

function showAccept(userid, nick, prefs) {
   /* Show the acceptance dialog */
   $("#accept-status").text("Athuga hvort andstæðingur er reiðubúinn...");
   $("#accept-nick").text(nick);
   $("#accept-dialog")
      .css("visibility", "visible");
   /* Launch a query to check whether the challenged user is online */
   serverQuery("/waitcheck",
      {
         user: userid
      },
      waitAccept);
}

function readyAccept(ev) {
   /* Trigger a timed game, if the opponent is waiting and ready to accept */
   ev.preventDefault();
   var param = ev.data;
   var prefs = param.prefs;
   if (prefs !== undefined && prefs.duration !== undefined && prefs.duration > 0) {
      showAccept(param.userid, param.nick, prefs);
   }
}

function markChallAndRefresh(ev) {
   /* Mark a challenge and refresh the user list */
   markChallenge(ev);
   redisplayUserList();
}

function challengeDescription(json) {
   /* Return a human-readable string describing a challenge
      according to the enclosed preferences */
   if (!json || json.duration === undefined || json.duration === 0)
      /* Normal unbounded (untimed) game */
      return "Venjuleg ótímabundin viðureign";
   return "Með klukku, 2 x " + json.duration.toString() + " mínútur";
}

var ival = null; // Flashing interval timer

function readyFlasher() {
   $(".opp-ready").toggleClass("blink");
}

function populateChallengeList(json) {
   /* Populate the lists of received and issued challenges */
   if (ival) {
      window.clearInterval(ival);
      ival = null;
   }
   if (!json || json.result === undefined)
      return;
   if (json.result !== 0)
      /* Probably out of sync or login required */
      /* !!! TBD: Add error reporting here */
      return;
   var countReceived = 0, countSent = 0, countReady = 0;
   for (var i = 0; i < json.challengelist.length; i++) {
      var item = json.challengelist[i];
      var opp = escapeHtml(item.opp);
      var prefs = escapeHtml(challengeDescription(item.prefs));
      var odd = ((item.received ? countReceived : countSent) % 2 === 0);
      /* Show Decline icon (thumb down) if received challenge;
         show Delete icon (cross) if issued challenge */
      var icon;
      var opp_ready = false;
      if (item.received)
         icon = "<span title='Hafna' " +
            "class='glyphicon glyphicon-thumbs-down'";
      else {
         icon = "<span title='Afturkalla' " +
            "class='glyphicon glyphicon-hand-right'";
         if (item.opp_ready)
            opp_ready = true; // Opponent ready and waiting for timed game
      }
      var accId = "accept" + i.toString();
      var readyId = "ready" + i.toString();
      var chId = "chl" + i.toString();
      icon += " id='" + chId + "'></span>";
      var str = "<div class='listitem " + (odd ? "oddlist" : "evenlist") + "'>" +
         "<span class='list-icon'>" + icon + "</span>" +
         (item.received ? ("<a href='#' id='" + accId + "'>") : "") +
         (opp_ready ? ("<a href='#' id='" + readyId + "' class='opp-ready'>") : "") +
         "<span class='list-ts'>" + item.ts + "</span>" +
         "<span class='list-nick'>" + opp + "</span>" +
         "<span class='list-chall'>" + prefs + "</span>" +
         (item.received ? "</a>" : "") +
         (opp_ready ? "</a>" : "") +
         "</div>";
      if (item.received) {
         $("#chall-received").append(str);
         // Route a click on the acceptance link
         $("#" + accId).click(
            { userid: item.userid, prefs: item.prefs },
            acceptChallenge
         );
         countReceived++;
      }
      else {
         $("#chall-sent").append(str);
         // Route a click on the opponent ready link
         if (opp_ready) {
            $("#" + readyId).click(
               { userid: item.userid, nick: item.opp, prefs: item.prefs },
               readyAccept
            );
            countReady++;
         }
         countSent++;
      }
      $("#" + chId).click(
         { userid: item.userid, nick: item.opp, fullname: "" },
         markChallAndRefresh
      );
   }
   // Update the count of received challenges and ready opponents
   if (countReceived + countReady === 0) {
      $("#numchallenges").css("display", "none");
   }
   else {
      $("#numchallenges").css("display", "inline-block")
         .text((countReceived + countReady).toString());
   }
   // If there is an opponent ready and waiting for a timed game,
   // do some serious flashing
   if (countReady)
      ival = window.setInterval(readyFlasher, 500);
}

function refreshChallengeList() {
   /* Clear list of challenges received by this user */
   $("#chall-received").html("");
   /* Clear list of challenges sent by this user */
   $("#chall-sent").html("");
   serverQuery("/challengelist",
      {
         // No data to send with query - current user is implicit
      },
      populateChallengeList);
}

function prepareChallenge() {
   /* Enable buttons in the challenge dialog */
   $("#chall-cancel").click(cancelChallenge);
   $("#chall-ok").click(okChallenge);
   $("div.chall-time").click(function() {
      $("div.chall-time").removeClass("selected");
      $(this).addClass("selected");
   });
}

function markOnline(json) {
   /* If the challenged user is online, show a bright icon */
   if (json && json.online !== undefined && json.online) {
      $("#chall-online").addClass("online");
      $("#chall-online").attr("title", "Er álínis");
   }
}

function showChallenge(elemid, userid, nick, fullname) {
   /* Show the challenge dialog */
   $("#chall-nick").text(nick);
   $("#chall-fullname").text(fullname);
   $("#chall-online").removeClass("online");
   $("#chall-online").attr("title", "Er ekki álínis");
   $("#chall-dialog")
      .data("param", { elemid: elemid, userid: userid })
      .css("visibility", "visible");
   /* Launch a query to check whether the challenged user is online */
   serverQuery("/onlinecheck",
      {
         user: userid
      },
      markOnline);
}

function cancelChallenge(ev) {
   /* Hide the challenge dialog without issuing a challenge */
   $("#chall-dialog")
      .data("param", null)
      .css("visibility", "hidden");
}

function okChallenge(ev) {
   /* Issue a challenge from the challenge dialog */
   var param = $("#chall-dialog").data("param");
   /* Find out which duration is selected */
   var duration = $("div.chall-time.selected").attr("id").slice(6);
   if (duration == "none")
      duration = 0;
   else
      duration = parseInt(duration);
   /* Inform the server */
   serverQuery("/challenge",
      {
         // Identify the relation in question
         destuser: param.userid,
         action: "issue",
         duration : duration
      },
      updateChallenges
   );
   /* Mark the challenge element */
   $("#" + param.elemid).removeClass("grayed");
   /* Tear down the dialog as we're done */
   cancelChallenge(ev);
}

/* Google Channel API stuff */

var channel = null;
var socket = null;
var channelToken = null;

function openChannel(token) {
   /* Open a new channel using the token stored in channelToken */
   channelToken = token;
   channel = new goog.appengine.Channel(token);
   socket = channel.open({
      onopen : channelOnOpen,
      onmessage : channelOnMessage,
      onerror : channelOnError,
      onclose : channelOnClose
   });
}

function channelOnOpen() {
}

function channelOnMessage(msg) {
   /* The server has sent a notification message back on our channel */
   var json = jQuery.parseJSON(msg.data);
   if (json.stale || json.kind == "challenge") {
      // A challenge to this user has been issued or retracted
      refreshChallengeList();
      redisplayUserList();
   }
   if (json.stale || json.kind == "game") {
      // A move has been made in a game for this user
      refreshGameList();
   }
   if (json.kind && json.kind == "game") {
      // Play audio, if present
      var yourTurn = document.getElementById("your-turn");
      if (yourTurn)
         // Note that playing media outside user-invoked event handlers does not work on iOS.
         // That is a 'feature' introduced and documented by Apple.
         yourTurn.play();
   }
}

function channelOnError(err) {
   /* Act on err.code and err.description here */
   // alert("Channel error: " + err.code + "," + err.description);
}

function newChannel(json) {
   /* Ajax callback, called when the server has issued a new channel token */
   if (json && json.result === 0) {
      // No error: get the new token and reopen the channel
      openChannel(json.token);
   }
}

function channelOnClose() {
   /* Channel expired: Ask for a new channel from the server */
   serverQuery("newchannel", { user: userId(), oldch: channelToken }, newChannel);
   channelToken = null;
   channel = null;
   socket = null;
}

function initMain() {
   /* Called when the page is displayed or refreshed */

   // Put lazy loading logic in place for tabs that are not displayed initially
   $("#tabs").tabs({
      heightStyle: "auto",
      activate: function(event, ui) {
         var panelId = ui.newPanel.attr('id');
         if (panelId == "tabs-2") {
            if (!$("#chall-received").html() && !$("#chall-sent").html())
               // Delay load challenge list
               refreshChallengeList();
         }
         else
         if (panelId == "tabs-4") {
            if (!$("#recentlist").html())
               // Delay load recent game list
               refreshRecentList();
         }
         else
         if (panelId == "tabs-3") {
            if (!$("#userlist").html())
               // Delay load user list
               if (displayedUserRange !== null)
                  refreshUserList({ data: displayedUserRange });
               else
                  /* Initialize user list to show robots by default */
                  refreshUserList({ data: "robots" });
         }
      }
   });

   $("#opponents").click(function() {
      // Select and show the user list (opponents) tab
      $("#tabs").tabs("option", "active", 2);
   });

   /* Initialize game list */
   refreshGameList();

   /* Initialize alphabet categories in user list header */
   $("div.user-cat span").each(function() {
      var data = $(this).attr('id');
      if (data === undefined)
         // Not a special category, i.e. favorites or robots
         data = $(this).text();
      $(this).click(data, refreshUserList);
   });

   /* Refresh the live user list periodically while it is being displayed */
   window.setInterval(periodicUserList, 5 * 60 * 1000); // Every five minutes

   /* Enable the close button in the user info dialog */
   $("#usr-info-close").click(hideUserInfo);

   /* Prepare the challenge dialog */
   prepareChallenge();

   /* Enable the cancel button in the acceptance dialog */
   $("#accept-cancel").click(cancelAccept);

   /* Call initialization that requires variables coming from the server */
   lateInit();

}

