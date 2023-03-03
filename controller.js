// primary storage
var cards = {};
var proj_total_count = 0;
var proj_loop_count = 0;
// last updated post floor
var floor = new Date();
floor.setDate(floor.getDate() - 28);
// caching thresholds
var runtime = new Date().getTime();
var cachetime = new Date().getTime();
var tolerance = 600000;
// version client designer filters
var ver_filter = getParameterByName('v');
var cli_filter = getParameterByName('c');
var des_filter = getParameterByName('d');

/* ######################################################################
   ######################################################################
	XXXXXS1	Stakeholder1
	XXXXXS2	Stakeholder2
	XXXXXS3	Stakeholder3
	
	XXXXXD1	Designer1
	XXXXXD2	Designer2
	XXXXXD3	Designer3
	
   ######################################################################
   ###################################################################### */

$(document).ready(function(){
	// load last cached
	$('body').load('cache.txt', function(){
		cachetime = $('#content').data('runtime');
		interactionLayer();
		window.console.log('Loading from File '+(runtime-cachetime));
		
		// timestamp verification
		if((((runtime - cachetime) > tolerance) || (ver_filter == 'nocache') || (cli_filter != null)) && des_filter == null){
			$('body').load('ref.txt?v=1', function(){
				$('#content').attr('data-runtime', runtime);
				window.console.log('Pulling from Mavenlink');
				// filter for active design team
				getProjects('https://api.mavenlink.com/api/v1/workspaces.json?page=1%26per_page=200%26has_participant=XXXXXD1');
				
				// label calendar
				renderCalendar();
			});
		}
		wormParty();
	});
});

function getProjects(qry){
	$.ajax({
		type: 'POST',
		url: 'query.php',
		data: 'qry=' + qry,
		dataType: 'text',
		success: function(data){
			// register temp vars
			var mavenProjects = $.parseJSON(data);
			window.console.log('=n/' + mavenProjects['count'] + ' : ' + '200');
			// window.console.log(mavenProjects['workspaces']);
			
			// client filter
			var proj_pattern = new RegExp(/email|online|misc/i);
			if(cli_filter){
				window.console.log('Client Filter '+cli_filter);
				proj_pattern = new RegExp(cli_filter, 'i');
			}
			
			// for each project
			$.each(mavenProjects['workspaces'], function(key, value){
				var updated_at = new Date(value['updated_at']);
				
				// ONLY projects UPDATED AFTER the FLOOR where MATCH TITLE CRITERIA
				if((updated_at.getTime() > floor.getTime()) && (/2018/.test(value['title'])) && (proj_pattern.test(value['title']))){
					
					// window.console.log(mavenProjects['workspaces'][value['id']]);
					proj_total_count++;
					getPosts(value['id'], 1, mavenProjects);
				}
			});
		}
	});
}

function getPosts(pid, page, mavenProjects){
	var qry = 'https://api.mavenlink.com/api/v1/posts.json?page=' + page + '%26per_page=200%26workspace_id=' + pid + '%26updated_after=' + floor.toISOString() + '%26include=user,story';
	$.ajax({
		type: 'POST',
		url: 'query.php',
		data: 'qry=' + qry,
		dataType: 'text',
		success: function(data){
			mavenPosts = $.parseJSON(data);
			proj_loop_count++;
			post_loop_count = 0;
			
			// split projects with null posts from those with activiy
			window.console.log(pid + ' -' + proj_loop_count + '/' + proj_total_count + ' ' + page + ':' + mavenPosts['count']);
			if(mavenPosts['count'] == 0){
				// null post cids still need a write check
				window.console.log(pid + ' +' + proj_loop_count + '/' + proj_total_count + ' ' + page + ':' + mavenPosts['count']);
				post_loop_count++;
				if((proj_total_count == proj_loop_count) && (post_loop_count == mavenPosts['count'])){
					cacheWriter();
				}
			}else{
				// follow-up requests for additional pages
				if(mavenPosts['meta']['page_count'] != page){
					page++;
					proj_total_count++
					getPosts(pid, page, mavenProjects);
				}
				
				// for each post stack
				window.console.log(pid + ' +' + proj_loop_count + '/' + proj_total_count + ' ' + page + ':' + mavenPosts['count']);
				// window.console.log(mavenPosts['posts']);
				renderPosts(mavenProjects, mavenPosts);
			}
		}
	});
}

function renderPosts(mavenProjects, mavenPosts){
	$.each(mavenPosts['posts'], function(key, value){
		var prs = value['parsed_message'].toLowerCase().replace(/\>/g, "&gt;").replace(/\</g, "&lt;");
		var cid = '';
		
		// this is a parent assignment, look for parent assignment info and create a new card
		if(value['story_id']){
			cid = value['id'];
			// if contains 'due' AND ('size' OR task 'graphic') then graphic assignment
			if(((/due/.test(prs)) && (/sizes|dimension/.test(prs))) || (/graphic|remaining|logo| motion/.test(mavenPosts['stories'][value['story_id']]['title'].toLowerCase()))){
				// building object reference
				cards[cid] = new Object;
				cards[cid]['client'] = mavenProjects['workspaces'][value['workspace_id']]['title'].replace(';', ':').replace('2018: ', '').replace('Online Advertising: ', '').replace(/ *\([^)]*\) */g, '');
				cards[cid]['project'] = value['workspace_id'];
				cards[cid]['task'] = value['story_id'];
				cards[cid]['brief'] = prs;
				// initial status
				cards[cid]['status'] = 'available';
				if(mavenPosts['stories'][cards[cid]['task']]['state'] == 'completed'){
					// tasks completing invalid posts
					cards[cid]['status'] = 'complete';
				}
				// assign default designer
				cards[cid]['designer'] = '[-?-]';
				if(/Stakeholder/.test(prs)){
					cards[cid]['designer'] = '[NEW]';
				}
				
				// clean up data for assigner, title, ml link, created, updated
				cards[cid]['accounts'] = mavenPosts['users'][value['user_id']]['full_name'].toUpperCase();
				cards[cid]['title'] = '<strong>' + cards[cid]['client'] + '</strong> ' + mavenPosts['stories'][value['story_id']]['title'];
				cards[cid]['link'] = 'https://app.mavenlink.com/workspaces/' + cards[cid]['project'] + '/#tracker/' + cards[cid]['task'];
				cards[cid]['created'] = moment(value['created_at']).format('MM-DD-YYYY');
				cards[cid]['updated'] = moment(value['updated_at']).format('MM-DD-YYYY');
				
				// pull due date out of content, assign default of today if nothing found or if found date is in the past
				cards[cid]['due'] = moment(chrono.parseDate(prs, new Date(cards[cid]['created']))).format('MM-DD-YYYY');
				if((cards[cid]['due'] == 'Invalid date') || (moment(new Date(cards[cid]['due'])).isBefore(new Date(cards[cid]['created'])))){
					cards[cid]['due'] = moment(chrono.parseDate('today', new Date(value['created_at']))).format('MM-DD-YYYY');
				}
				
				// assign sameday flag
				hours = Math.abs(new Date(cards[cid]['due']) - new Date(value['created_at'])) / 36e5;
				if(hours < 24){
					cards[cid]['modifiers'] = 'true';
				}else{
					cards[cid]['modifiers'] = 'false';
				}
				
				// assign motion graphic flag
				if((/seconds| motion/.test(prs)) || (/video|motion/.test(mavenPosts['stories'][value['story_id']]['title'].toLowerCase()))){
					cards[cid]['modifiers'] = cards[cid]['modifiers'] + ' motion';
				}
				
				// if due date on the calendar then rack up task
				if($('#' + cards[cid]['due']).length != 0){
					$('#' + cards[cid]['due']).append('<div id="' + cid + '" class="task ' + cards[cid]['status'] + ' ' + cards[cid]['modifiers'] + ' NEW" data-due="' + cards[cid]['due'] + ', " data-history="' + cards[cid]['status'] + ', " data-client="'+cards[cid]['client']+'" data-chain="' + value['user_id'] + ', ">' + '<span class="designer">' + cards[cid]['designer'] + '</span>' + '<a class="link" target="_blank" href="' + cards[cid]['link'] + '" title="' + cards[cid]['created'] + ' - ' + cards[cid]['accounts'] + ' - ' + prs + '"><i class="far fa-clock"></i><i class="fas fa-video"></i>' + cards[cid]['title'] + '</a><span class="ctr">' + value['reply_count'] + '</span>' + '</div>');
					var completed = parseInt($('#' + cards[cid]['due'] + ' .deliver').length) + parseInt($('#' + cards[cid]['due'] + ' .approval').length) + parseInt($('#' + cards[cid]['due'] + ' .complete').length + parseInt($('#' + cards[cid]['due'] + ' .hold').length));
					$('#' + cards[cid]['due'] + ' .count').text(completed + '/' + $('#' + cards[cid]['due'] + ' .task').length);
				// otherwise stash in for later
				}else{
					$('#penalty_box').append('<div id="' + cid + '" class="task ' + cards[cid]['status'] + ' ' + cards[cid]['modifiers'] + '">' + '<span class="designer">' + cards[cid]['designer'] + '</span>' + '<a class="link" target="_blank" href="' + cards[cid]['link'] + '" title="' + cards[cid]['created'] + ' - ' + cards[cid]['accounts'] + ' - ' + prs + '"><i class="far fa-clock"></i><i class="fas fa-video"></i>' + cards[cid]['title'] + '</a><span class="ctr">' + value['reply_count'] + '</span>' + '</div>');
				}
			}
		}else{
			// this is a child assignment, check if card exists, ensure not a 'partial' thread, if so then this is a response to a design thread
			if((cards[value['subject_id']] != undefined) && (mavenPosts['stories'][cards[value['subject_id']]['task']] != undefined)){
				cid = value['subject_id'];
				var designer = cards[cid]['designer'];
				
				if(/hold|cancel|pause|flagging/.test(prs)){
					// everyone can invoke hold
					cards[cid]['status'] = 'hold';
				}else if(((value['user_id'] == 'XXXXXD1') || (value['user_id'] == 'XXXXXD2') || (value['user_id'] == 'XXXXXD3') || (value['user_id'] == 'XXXXXS3')) && (/app.box|box.com/.test(prs))){
					// designers can deliver products
					cards[cid]['status'] = 'deliver';
				}else{
					if(/push| mov|due|today|tomorrow/.test(prs)){
						// filter shifting deadlines
						var deadline = moment(chrono.parseDate(prs, new Date(cards[cid]['due']))).format('MM-DD-YYYY');
						
						// intended deadline shifts
						var due = $('#' + cid).data('due') + deadline + ', ';
						$('#' + cid).data('due', due);
						$('#' + cid).attr('data-due', due);
						
						var now = moment(value['created_at']).format('MM-DD-YYYY')
						
						if((deadline != 'Invalid date') && (moment(new Date(deadline)).isSameOrAfter(new Date(now)))){
							// window.console.log(cards[cid]['title']+' : '+cards[cid]['due']+' -> '+deadline);
							var original = cards[cid]['due'];
							cards[cid]['due'] = deadline;
							
							if($('#' + cards[cid]['due']).length != 0){
								// if new date is on board, move
								$('#' + cid).detach().appendTo('#' + cards[cid]['due']);
								var completed = parseInt($('#' + original + ' .deliver').length) + parseInt($('#' + original + ' .approval').length) + parseInt($('#' + original + ' .complete').length + parseInt($('#' + original + ' .hold').length));
								$('#' + original + ' .count').text(completed + '/' + $('#' + original + ' .task').length);
								
								// add morning flag
								if(/morning| noon| am,| am.| am /.test(prs)){
									$('#' + cid).addClass('AM');
								}
							}
						}
						cards[cid]['status'] = 'revise';
					}else if((mavenPosts['stories'][cards[cid]['task']]['state'] == 'completed') || (/to client|for approval/.test(prs))){
						// tasks can be completed, sent for approval
						cards[cid]['status'] = 'complete';
					}else{
						// everything else is chatter, production team or other
						if((value['user_id'] == 'XXXXXS1') || (value['user_id'] == 'XXXXXS2') || (value['user_id'] == 'XXXXXS3') || (value['user_id'] == 'XXXXXD1') || (value['user_id'] == 'XXXXXD2') || (value['user_id'] == 'XXXXXD3')){
							
							cards[cid]['status'] = 'd-comment';
							if(/on it|on this/.test(prs)){
								if(value['user_id'] == 'XXXXXD1'){
									designer = 'D1';
								}
								if(value['user_id'] == 'XXXXXD2'){
									designer = 'D2';
								}
								if(value['user_id'] == 'XXXXXD3'){
									designer = 'D3';
								}
							}
							
						}else{
							cards[cid]['status'] = 'a-comment';
						}
					}
				}
				
				// percolate to top
				cards[cid]['updated'] = moment(new Date(value['updated_at'])).format('MM-DD-YYYY');
				if(moment(new Date(value['updated_at'])).isAfter(new Date(cards[cid]['due']))){
					var original = cards[cid]['due'];
					cards[cid]['due'] = cards[cid]['updated'];
					
					if($('#' + cards[cid]['due']).length != 0){
						// if new date is on board, move
						$('#' + cid).detach().appendTo('#' + cards[cid]['due']);
						var completed = parseInt($('#' + original + ' .deliver').length) + parseInt($('#' + original + ' .approval').length) + parseInt($('#' + original + ' .complete').length + parseInt($('#' + original + ' .hold').length));
						$('#' + original + ' .count').text(completed + '/' + $('#' + original + ' .task').length);
					}
				}
				
				if((value['user_id'] == 'XXXXXS1') || (value['user_id'] == 'XXXXXS2') || (value['user_id'] == 'XXXXXS3') || (value['user_id'] == 'XXXXXD1') || (value['user_id'] == 'XXXXXD2') || (value['user_id'] == 'XXXXXD3')){
					// refresh designer
					if(/@Designer1/.test(prs)){
						designer = 'D1';
					}
					if(/@Designer2/.test(prs)){
						designer = 'D2';
					}
					if(/@Designer3/.test(prs)){
						designer = 'D3';
					}
					// if(/external/.test(prs)){
					// 	designer = 'EX';
					// }
					if(designer == '[NEW]'){
						designer = 'NEW';
					}
					cards[cid]['designer'] = designer;
					if($('#' + cid).length != 0){
						$('#' + cid).find('.designer').text(designer);
						$('#' + cid).removeClass('D1 D2 D3 EX NEW').addClass(designer);
					}
				}
				
				// refresh status, history, columns
				$('#' + cid).removeClass('available revise d-comment a-comment deliver approval complete hold').addClass(cards[cid]['status']);
				
				var history = $('#' + cid).data('history') + cards[cid]['status'] + ', ';
				$('#' + cid).data('history', history);
				$('#' + cid).attr('data-history', history);
				var chain = $('#' + cid).data('chain') + value['user_id'] + ', ';
				$('#' + cid).data('chain', chain);
				$('#' + cid).attr('data-chain', chain);
				var completed = parseInt($('#' + cards[cid]['due'] + ' .deliver').length) + parseInt($('#' + cards[cid]['due'] + ' .approval').length) + parseInt($('#' + cards[cid]['due'] + ' .complete').length + parseInt($('#' + cards[cid]['due'] + ' .hold').length));
				$('#' + cards[cid]['due'] + ' .count').text(completed + '/' + $('#' + cards[cid]['due'] + ' .task').length);
			}
		}
		
		// write check
		post_loop_count++;
		if((proj_total_count == proj_loop_count) && (mavenPosts['meta']['page_count'] == mavenPosts['meta']['page_number']) && (post_loop_count == (mavenPosts['count']%200))){
			cacheWriter();
		}
	});
}

function cacheWriter(){
	// write to file
	if(cli_filter == null){
		$.ajax({
			type: 'POST',
			url: 'write.php',
			data: {value: $('body').html()},
			dataType: 'text',
			success: function(data){
				window.console.log('Writing to File');
			}
		});
	}
}

function renderCalendar(){
	// label calendar
	var start = moment(chrono.parseDate('last sunday')).format('MM-DD-YYYY');
	
	// rough month calc
	$('.day').each(function(){
		$(this).attr('id', start);
		$(this).find('.title').text(start);
		start = moment(start, 'MM-DD-YYYY').add(1, 'days').format('MM-DD-YYYY');
	});
	
	// render current week
	var current = moment(chrono.parseDate('today')).format('MM-DD-YYYY');
	
	$('#' + current).prevAll('.weekday:first').addClass('render second').prevAll('.weekday:first').addClass('render first');
	$('#' + current).addClass('today').addClass('render');
	$('#' + current).nextAll('.weekday:first').addClass('render fourth').nextAll('.weekday:first').addClass('render fifth');
	
	interactionLayer();
}

function interactionLayer(){
	$('#key div').click(function(){
		key_classes = $(this).attr('class');
		class_array = key_classes.split(/\s+/);
		matching_class = class_array[1];
		$('#content .' + matching_class ).slideToggle();
	});
	if(des_filter != null){
		$('.D1, .D2, .D3, .EX, .NEW').hide();
		$('.task').addClass('delete');
		$('.'+des_filter).removeClass('delete');
		$('.'+des_filter).slideToggle();
		$('.delete').remove();
	}
}

function wormParty(){
	// add the worm
	var party = Math.floor((Math.random() * 12) + 1);
	if(party == 12 || party == 6){
		$('.first').addClass('melon_worm');
	}
	window.console.log('Rolling D12... ' + party);
}

function getParameterByName(name, url){
	if(!url) url = window.location.href;
	name = name.replace(/[\[\]]/g, '\\$&');
	var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
		results = regex.exec(url);
	if(!results) return null;
	if(!results[2]) return '';
	return decodeURIComponent(results[2].replace(/\+/g, ' '));
}