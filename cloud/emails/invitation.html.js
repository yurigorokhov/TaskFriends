
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta name="viewport" content="width=device-width" />
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<title>Welcome to TaskFriends</title>
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
						<h3>You have been invited to TaskFriends</h3>
						<p class="lead"><%= data.user %> has invited you to join the group <%= data.circle %></p>
						<!-- Callout Panel -->
						<p class="callout">
							Accept the invitation by registering at <a target="_blank" href="<%= data.url %>">TaskFriends &raquo;</a>
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