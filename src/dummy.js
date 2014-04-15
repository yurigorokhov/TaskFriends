var dummyTasks = [
		{
		  owner: '@Andy',
		  prizes: [
		  	{
		  		contributor: '@Andy',
		  		reward: 'Beer'
		  	},
		  	{
		  		contributor: '@Shannon',
		  		reward: 'Lunch'
		  	}
		  ],
		  title: 'Bring me coffee',
		  body: 'Bring me a coffee'
		},
		{
		  owner: '@Shannon',
		  prizes: [
		  	{
		  		contributor: '@Andy',
					reward: {
						name: 'Beer',
						value: 5
					},
					quantity: 2
		  	},
		  	{
		  		contributor: '@Shannon',
		  		reward: {
					name: 'Lunch',
					value: 15
				},
				quantity: 1
		  	}
		  ],
		  title: 'Help me move my desk',
		  body: 'Help me move my desk'
		}
	];

var rewards = [
	{
		name: 'Beer',
		value: 5
	},
	{
		name: 'Lunch',
		value: 15
	}
];