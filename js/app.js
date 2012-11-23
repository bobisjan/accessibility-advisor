/**
  Accessibility Advisor

  Jan Bobisud [bobisjan@fel.cvut.cz]

  Department of Computer Graphics and Interaction
  Faculty of Electrical Engineering
  Czech Technical University in Prague
*/



var App = Em.Application.create();

App.store = DS.Store.create({
  revision: 6,
  adapter: DS.RESTAdapter.create({
    namespace: 'Accessibility%20Advisor%20API'
  })
});


/* Define application's model */

App.Group = DS.Model.extend({
  title: DS.attr('string'),
  description: DS.attr('string'),
  questions: DS.hasMany('App.Question'),

  editLabelText: DS.attr('string'),
  continueText: DS.attr('string'),
    
  isGroup: true,
  
  isValid: function() {
  	return this.get('questions').everyProperty('isValid', true);
  }.property('questions.@each.isValid'),
  
  isNotValid: function() {
  	return !this.get('isValid');
  }.property('isValid'),
  
  isDisabled: function() {
  	var previous = this.get('previous');
  	return (previous) ? !previous.get('isValid') : true;
  }.property('previous.isValid'),
  
  next: null,
  previous: null,
  
  hasNext: function() {
    return !Em.none(this.get('next'));
  }.property('next'),
  
  hasPrevious: function() {
  	return !Em.none(this.get('previous'));
  }.property('previous')
});

App.Question = DS.Model.extend({
  title: DS.attr('string'),
  description: DS.attr('string'),
  type: DS.attr('number'),
  validators: DS.attr('string'),
  group: DS.belongsTo('App.Group'),
  answers: DS.hasMany('App.Answer'),
      
  isRadio: function() {
  	return (this.get('type') === 0);
  }.property('type'),
  
  isCheckbox: function() {
  	return (this.get('type') === 1);
  }.property('type'),
  
  isSelect: function() {
  	return (this.get('type') === 2);
  }.property('type'),
  
  isValid: function() {
  	if (!this.get('isLoaded')) { return false; }
  
  	var validators = this.get('validators').w(),
  	    answers = this.get('answers'),
  	    valid = false;
  	
  	validators.forEach(function(validator) {
  	  if (validator === 'not_empty') {
  	    valid = answers.someProperty('checked', true);
  	  }
  	});
  	return valid;
  }.property('answers.@each.checked')
});

App.Answer = DS.Model.extend({
  title: DS.attr('string'),
  disabled: DS.attr('boolean'),
  hidden: DS.attr('boolean'),
  question: DS.belongsTo('App.Question'),
  
  backend: DS.attr('number'),
  
  checked: false
});


/* Define controllers with views */

App.answersController = Em.ArrayController.create({
  content: App.store.findAll(App.Answer)
});

App.ApplicationController = Em.Controller.extend();
App.ApplicationView = Em.View.extend({
  templateName: 'application',
  classNames: ['app']
});

App.SurveyController = Em.ArrayController.extend({
  groups: App.store.findAll(App.Group),
  
  selected: null,
	
  content: function() {
    var self = this,
        tabs = [],
        groups = this.get('groups');

    tabs = groups.map(function(item, index, self) {
	  item.set('tabId', "tab" + item.get('id'));
	  item.set('tabTarget', "tab-content-" + item.get('id'));
	  item.set('tabHref', "#tab-content-" + item.get('id'));
	  return item;
	});

    if (tabs.get('length') > 0) {
      tabs[tabs.get('length')] = this.get('summary');
    }

    tabs.forEach(function(item, index) {
	  if (index === 0) {
	    self.set('selected', item);
	  }
	  if (index > 0) {
        item.set('previous', tabs[index - 1]);
      }
      if (index < (tabs.get('length') - 1)) {
        item.set('next', tabs[index + 1]);
      }
    });
    return tabs;
  }.property('groups.@each'),
	
  isValid: function() {
    return this.get('summary').get('isValid');
  }.property('summary.isValid'),

  summary: Em.Object.create({
    tabId: "tab0",
    tabTarget: "tab-content-0",
    tabHref: "#tab-content-0",
    title: "Summary",
    summary: true,

    isSummary: true,

    isValid: function() {
      return this.get('hasPrevious') && this.get('previous').get('isValid');
    }.property('hasPrevious.isValid'),

    isNotValid: function() {
      return !this.get('isValid');
    }.property('isValid'),

    isDisabled: function() {
      var previous = this.get('previous');
      return (previous) ? !previous.get('isValid') : true;
    }.property('previous.isValid'),

    next: null,
    previous: null,

    hasNext: function() {
      return !Em.none(this.get('next'));
    }.property('next'),

    hasPrevious: function() {
      return !Em.none(this.get('previous'));
    }.property('previous')
  })
});
App.SurveyView = Em.View.extend({
  templateName: 'survey',

  init: function() {
    this._super();
    // fixes something
    App.router.get('surveyController').set('view', this);
  },

  tabsView: UI.TabsView.extend({
    heightStyle: 'content',
    collapsible: false,
    	
    selectedChanged: function() {
      var self = this,
          controller = App.router.get('surveyController'),
          selected = controller.get('selected'),
          index = controller.get('content').indexOf(selected);
        
      Em.run.schedule('afterRender', function() {
        self.get('ui').option('active', index);
        self.$('#' + selected.get('tabId')).focus();
      });
    }.observes('App.router.surveyController.selected'),
    	
    activate: function() {
      var controller = App.router.get('surveyController'),
          index = this.get('ui').option('active'),
          selected = controller.objectAt(index);

      controller.set('selected', selected);
      this.$('#' + selected.get('tabId')).focus();
    },
    
    didInsertElement: function() {
      this._super();
      
      var self = this,
          selected = this.get('controller').get('selected'),
          index = this.get('controller').get('content').indexOf(selected);
      
      if (index === -1) { return; }

      Em.run.schedule('afterRender', function() {
        self.get('ui').option('active', index);
      });
    },

    nextView: UI.ButtonView.extend({
      click: function() {
        var controller = App.router.get('surveyController'),
            selected = controller.get('selected'),
            ui = this.get('parentView').get('ui'),
            index = ui.option('active');

        if (selected.get('hasNext')) {
          ui.option('active', index + 1);
        }
      }
    }),

    previousView: UI.ButtonView.extend({
      click: function() {
        var controller = App.router.get('surveyController'),
            selected = controller.get('selected'),
            ui = this.get('parentView').get('ui'),
            index = ui.option('active');

        if (selected.get('hasPrevious')) {
          ui.option('active', index - 1);
        }
      }
    }),
    	
    groupView: UI.AccordionView.extend({
      templateName: 'group',

      header: 'h3',
      heightStyle: 'content',
      collapsible: false,

      questionView: Em.View.extend({
        templateName: 'question',

        selectedAnswerId: null,

        selectedAnswerIdChanged: function() {
          var question = this.get('controller'),
              id = this.get('selectedAnswerId'),
              answer = question.get('answers').filterProperty('id', id).get('firstObject');

          question.get('answers').filterProperty('checked', true).setEach('checked', false);
          if (answer) {
            answer.set('checked', true);
          }
        }.observes('selectedAnswerId')
      })
    }),
	    
    summaryView: Em.View.extend({
      templateName: 'summary',

      tree: function() {
        return this.$('.tree');
      }.property(),

      reload: function() {
        var groups = this.get('parentView').get('controller').get('groups'),
            jsTree = this.get('tree'),
            tree = '';

        tree += '<ul>';

        groups.forEach(function (group) {
          tree += '<li>';
          tree += '<a href="#" data-type="group" data-id="' + group.get('id') + '">' + group.get('title') + '</a>';
          tree += '<ul>';

          group.get('questions').forEach(function(question) {
            tree += '<li>';
            tree += '<a href="#" data-type="question" data-id="' + question.get('id') + '">' + question.get('title') + ': ';

            question.get('answers').filterProperty('checked', true).forEach(function(answer) {
              tree += ' ' + answer.get('title') + ',';
            });

            tree += '</a>';
            tree += '</li>';
          });

          tree += '</ul>';
          tree += '</li>';
        });

        tree += '</ul>';

        jsTree.jstree({
          core: { 'open_parents': false },
          html_data: { data: tree },
          ui: { select_limit: 1 },
          plugins: ['html_data', 'ui', 'themes', 'hotkeys']
        });
      }.observes('App.answersController.@each.checked'),

      goToResultView: UI.ButtonView.extend({
        click: function() {
          App.router.transitionTo('root.result');
        }
      }),

      didInsertElement: function() {
        this.reload();
      }
    }),
  })
});

App.ResultController = Em.ArrayController.extend({
  isLoaded: false,

  content: [],
  
  selected: null,

  load: function() {
    this.set('isLoaded', false);

    var self = this,
        questions = App.store.findAll(App.Question),
        url = "/Accessibility%20Advisor%20API/result",
        tmp = null,
        answers = null,
        parameters = {};

    questions.forEach(function(item, index) {
      answers = item.get('answers').filterProperty('checked', true);

      if (answers.get('length') === 0) { return; }

      tmp = item.get('title').dasherize();

      if (item.get('isRadio') || item.get('isSelect')) {
        parameters[tmp] = answers.get('firstObject').get('backend');

      } else if (item.get('isCheckbox')) {
        parameters[tmp] = [];
        answers.forEach(function(item, index) {
          parameters[tmp][index] = item.get('backend');
        });
      }
    });

    jQuery.ajax({
      url: url,
      dataType: 'json',
      data: parameters,
      contentType: 'application/json; charset=utf-8',
      success: function(data) {
        self._didLoadResult(data);
      },
      error: function(error) {
        self._didError(error);
      }
    });
  },

  unload: function() {
    this.set('isLoaded', false);
    this.set('selected', null);
    this.clear();
  },

  _didLoadResult: function(data) { 
    for (item in data.result) {
      var tab = Em.Object.create({
        isRecommendations: function() {
          return this.get('id') === 'recommendations';
        }.property('id'),
        isPersonas: function() {
          return this.get('id') === 'personas';
        }.property('id'),
        isTools: function() {
          return this.get('id') === 'tools';
        }.property('id'),
        
        next: null,
        previous: null,
        
        hasNext: function() {
          return !Em.none(this.get('next'));
        }.property('next'),
        
        hasPrevious: function() {
        	return !Em.none(this.get('previous'));
        }.property('previous')
      });
      
      tab.set('tabId', "tab" + item.dasherize());
      tab.set('tabHref', "#tab-content-" + item.dasherize());
      tab.set('tabTarget', "tab-content-" + item.dasherize());
      tab.set('id', item);
      tab.set('title', item.classify());
      
      var items = data.result[item];
      
      if (items && items.get('length')) {
        tab.set('content', items.map(function(item, index, self) {
          return Em.Object.create(item);
        }));   
      } else {
        tab.set('content', []);
      }
      this.pushObject(tab);
    }
    
    var self = this;
    var content = this.get('content');
    var length = content.get('length');
    
    content.forEach(function(item, index) {
      if (index === 0) {
        self.set('selected', item);
      }
      if (index > 0) {
        item.set('previous', content.objectAt(index - 1));
      }
      if (index < length - 1) {
        item.set('next', content.objectAt(index + 1));
      }
    });
    
    this.set('isLoaded', true);
  },

  _didError: function(error) {
    var message;

    if (error && error.isError) {
      message = error.message;
    } else {
      message = "Unable to load result from server, please try again later.";
    }
    alert(message);

    App.get('router').send('goToSurvey');
    App.get('router').get('surveyController').selectSummary();
  }
});
App.ResultView = UI.TabsView.extend({
  templateName: 'result',
  
  init: function() {
    this._super();
    // fixes something
    App.router.get('resultController').set('view', this);
  },
  
  tabsView: UI.TabsView.extend({
    templateName: 'resultTabs',
    
    heightStyle: 'content',
      
      activate: function() {
        var controller = App.router.get('resultController'),
            ui = this.get('ui'),
            index = ui.option('active');
            tab = controller.objectAt(index);
    
        controller.set('selected', tab);
        this.$('#' + tab.get('tabId')).focus();
      },
      
      //fixes UI.TabsView.tabsBar observer
      tabsChanged: function() {
        var self = this;
        var content = this.get('controller').get('content');
        var ui = this.get('ui');
            
        if (content && ui) {
          Em.run.schedule('afterRender', function() {
            ui.refresh();
            content.forEach(function(item, index) {
            	if (index === 0) {
            		ui.option('active', index);
            		self.$('#' + item.get('tabId')).focus();
            	} else if (item.get('isDisabled')) {
            		ui.disable(index);
            	} else {
            		ui.enable(index);
            	}
            });
          });
        }
      }.observes('controller.content.@each'),
    
      recommendationsView: UI.AccordionView.extend({
        templateName: 'recommendations',
        
        header: 'h3',
        heightStyle: 'content',
        collapsible: false
      }),
      
      personasView: UI.AccordionView.extend({
        templateName: 'personas',
        
        header: 'h3',
        heightStyle: 'content',
        collapsible: true
      }),
      
      toolsView: UI.AccordionView.extend({
        templateName: 'tools',
        
        header: 'h3',
        heightStyle: 'content',
        collapsible: true
      }),
      
      nextView: UI.ButtonView.extend({
        click: function() {
          var controller = App.router.get('resultController'),
              selected = controller.get('selected'),
              ui = this.get('parentView').get('ui'),
              index = ui.option('active');
    
          if (selected && selected.get('hasNext')) {
            ui.option('active', index + 1);
          }
        }
      }),
    
      previousView: UI.ButtonView.extend({
        click: function() {
          var controller = App.router.get('resultController'),
              selected = controller.get('selected'),
              ui = this.get('parentView').get('ui'),
              index = ui.option('active');
    
          if (selected && selected.get('hasPrevious')) {
            ui.option('active', index - 1);
          }
        }
      }),
    
      goBackView: UI.ButtonView.extend({
        label: 'Go Back',
        click: function() {
          App.get('router').send('goToSurvey');
        }
      }),
      
      didInsertElement: function() {
        this._super();
              
        var self = this,
            selected = this.get('controller').get('selected'),
            index = this.get('controller').get('content').indexOf(selected);

        if (index === -1) { return; }

        Em.run.schedule('afterRender', function() {
          self.get('ui').option('active', index);
          self.$('#' + selected.get('tabId')).focus();
        });
      }
  })
});


/* Set up router */

App.Router = Em.Router.extend({
  root: Em.Route.extend({
    index: Em.Route.extend({
      route: '/',
      connectOutlets: function(router, context) {
      	router.get('applicationController').connectOutlet('survey');
      }
    }),
    result: Em.Route.extend({
      route: '/result',
      connectOutlets: function(router, context) {
        if (!router.get('surveyController').get('isValid')) {
          router.send('goToSurvey');
          return;
        }
        router.get('applicationController').connectOutlet('result');
        router.get('resultController').load();
      },
      exit: function (router) {
        router.get('resultController').unload();
      },
      goToSurvey: Em.Route.transitionTo('root.index')
    })
  })
});


/* Run the application! */

App.initialize();
