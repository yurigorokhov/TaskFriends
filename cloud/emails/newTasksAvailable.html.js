
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta name="viewport" content="width=device-width" />

<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<title>TaskFriends has some new tasks</title>
</head>
 
<body bgcolor="#FFFFFF">

<!-- HEADER -->
<table class="head-wrap" bgcolor="#999999">
	<tr>
		<td></td>
		<td class="header container" >
				
				<div class="content">
				<table bgcolor="#999999">
					<tr>
						<td><h3>TaskFriends</h3></td>
						<!--<td align="right"><h6 class="collapse">Basic</h6></td>-->
					</tr>
				</table>
				</div>
				
		</td>
		<td></td>
	</tr>
</table><!-- /HEADER -->


<!-- BODY -->
<table class="body-wrap">
	<tr>
		<td></td>
		<td class="container" bgcolor="#FFFFFF">

			<div class="content">
			<table>
				<tr>
					<td>
						<h3>Hi, <%= data.user.name %></h3>
						<p class="lead">New tasks are available on TaskFriends in group: <%= data.circle %></p>
						<ul>
							<% _(data.tasks).each(function(task) { %>
								<li>
									<%= task.title %>
								</li>
							<% }); %>
						</ul>
						<!-- Callout Panel -->
						<p class="callout">
							Claim these tasks at <a target="_blank" href="http://www.taskfriends.com/#/explore">TaskFriends &raquo;</a>
						</p><!-- /Callout Panel -->		
						
					</td>
				</tr>
			</table>
			</div><!-- /content -->
									
		</td>
		<td></td>
	</tr>
</table><!-- /BODY -->
</body>
</html>