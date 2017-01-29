jsPlumb.ready (function () {
  //
  // initialize the model and environment
  //
  var initialize = function () {
    if (!instance) {
      instance = jsPlumb.getInstance ({
        Endpoint: [ "Dot", {radius: 3} ],
        Connector: "StateMachine",
        HoverPaintStyle: {
          stroke: "#1e8151",
          strokeWidth: 2
        },
        ConnectionOverlays: [
          [ "Arrow", {
            location: 1,
            id: "arrow",
            length: 10,
            width: 10,
            foldback: 0.8
          } ],
          [ "Label", { label: "transition", id: "label", cssClass: "aLabel" }]
        ],
        Container: "state-editor"
      });
    }

    instance.registerConnectionType ("basic", {
      anchor: "Continuous",
      connector: "StateMachine"
    });

    instance.deleteEveryEndpoint ();
    instance.empty ("state-editor");
    instance.reset ();

    instance.repaintEverything ();

    _model = {'actor': 'unnamed', 'nodes': [], 'transitions': []};
    _transition = null;
    _state = null;
    _filename = 'unnamed.json';

    //
    // initialize the navigator
    //
    $('#actor-navigator').html ($('<li class="active">' + _model['actor'] + '</li>'));

    return;
  }

  //
  // initialize the jsPlumbing toolkit
  //
  var instance = null;
  initialize ();

  //
  // global storage of the model data
  //
  var _model = {'actor': 'unnamed', 'nodes': [], 'transitions': []};
  var _filename = null;

  //
  // global storage of elements being edited
  //
  var _transition = null;
  var _state = null;

  //
  // create a new/empty model
  //
  $("#new-model").on ('click', function (e) {
    initialize ();
  });

  //
  // open an existing model
  //
  $("#open-model").on ('click', function (e) {
    //
    // clear the file selection, else 'onchange' won't work
    //
    var element = $('#model-file-selector');
    element.off ('change');
    element.closest ('form').get (0).reset ();

    //
    // raise the file selector
    //
    element.click ();

    //
    // handle the selection of a file
    //
    element.on ('change', function () {
      initialize ();
      var file = this.files[0];
      _filename = file.name;
      var reader = new FileReader ();

      reader.onload = function (e) {
        _model = JSON.parse (e.target.result);

        //
        // initialize the navigator
        //
        $('#actor-navigator').html ($('<li><a  style="cursor: pointer;"id="navigate-actor_' + _model['actor'] + '">' + _model['actor'] + '</a></li><li class="active">top</li>'));

        //
        // initialize the graph without excessive redrawing
        //
        instance.batch (function () {
          //
          // construct the nodes
          //
          $.each (_model.nodes, function () {
            create (this);
          });

          //
          // construct the transitions
          //
          $.each (_model.transitions, function () {
            connect (this);
          });
        });
      };

      reader.readAsText (file, "UTF-8");
    });

    return;
  });

  //
  // save the current model
  //
  $("#save-model").on ('click', function (e) {
    var text = JSON.stringify (_model, 2, ' ');

    if (typeof (Storage) !== "undefined") {
      //
      // save to local storage
      //
      localStorage.setItem (_filename, text);
      alert (text);
    }
    else {
      //
      // save via the download mechanism
      //
      var blob = new Blob ([text], {type: "application/json;charset=utf-8"});
      saveAs (blob, _filename);
    }

    return;
  });

  //
  // close the current model
  //
  $("#close-model").on ('click', function (e) {
    initialize ();
  });

  //
  // exit the modeling tool
  //
  $("#file-exit").on ('click', function (e) {
    initialize ();
    window.close ();
  });

  //
  // help menu items
  //
  $("#help-getting-started").on ('click', function (e) {
    $('#help-getting-started-dialog').modal ('show');
  });

  $("#help-toolchain").on ('click', function (e) {
    $('#help-toolchain-dialog').modal ('show');
  });

  $("#help-tutorials").on ('click', function (e) {
    $('#help-tutorials-dialog').modal ('show');
  });

  $("#help-license").on ('click', function (e) {
    $('#help-license-dialog').modal ('show');
  });

  $("#help-about").on ('click', function (e) {
    $('#help-about-dialog').modal ('show');
  });

  //
  // hide the add-node context menu when not immediately used
  //
  $('#add-node-menu').on ('mouseleave', function (e) {
    $('#add-node-menu').hide ();
  });

  //
  // main state editor context menu
  //
  instance.on ($('#state-editor'), 'contextmenu', function (e) {
    var x = e.clientX;
    var y = e.clientY;

    //open menu
    var menu = $('#add-node-menu').show ().css ({position: "absolute", left: x, top: y})
        .off ('click')
        .on ('click', 'a', function (e) {
          menu.hide ();

          // FIXME - the node locations are a bit off...

          var choice = $(e.target);
          var nx = x;
          var ny = y - menu.height ();

          var node = {'type': '', 'label': null, 'x': nx, 'y': ny};

          if ($(choice).attr ('id') == 'add-initial-state') {
            node['type'] = 'initial';
          }
          else if ($(choice).attr ('id') == 'add-state') {
            node['type'] = 'state';
          }
          else if ($(choice).attr ('id') == 'add-choice-point') {
            node['type'] = 'choice';
          }
          else if ($(choice).attr ('id') == 'add-terminal-state') {
            node['type'] = 'terminal';
          }

          create (node);
      });

    e.stopPropagation ();
    e.stopImmediatePropagation ();
    e.preventDefault ();

    return (false);
  });

  //
  // set state name
  //
  $("#change-state-name").on ('click', function (e) {
    if (_state) {
      _state.find ('span').text ($('#state-name').val ());
    }
  });

  //
  // delete state from model
  //
  $("#delete-state").on ('click', function (e) {
    if (_state) {
      instance.remove (_state);
      _state = null;
    }
  });

  //
  // callback for editing states
  //
  var edit_state_callback = function (c, e) {
    _state = $(c);
    $('#state-name').val (_state.text ());
    $('#state-editor-form').modal ('show');

    // FIXME...
    $('#state-entry-code').val ('//\n// state entry code\n//\nstd::cout << "enter";');
    $('#state-exit-code').val ('//\n// state exit code\n//\nstd::cout << "exit";');

    e.stopPropagation ();
    e.stopImmediatePropagation ();
    e.preventDefault ();

    return (false);
  }

  //
  // bind a connection listener to add connections between nodes
  //
  instance.bind ("connection", function (info) {
    info.connection.getOverlay ("label").setLabel (info.connection.id);

    //
    // bind a contextmenu listener for editing connections
    //
    info.connection.bind ("contextmenu", function (c, e) {
      return (edit_transition_callback (c, e));
    });
  });

  //
  // set transition name
  //
  $("#change-transition-name").on ('click', function (e) {
    if (_transition) {
      _transition.getOverlay ("label").setLabel ($('#transition-name').val ());
    }
  });

  //
  // delete transition from model
  //
  $("#delete-transition").on ('click', function (e) {
    if (_transition) {
      instance.detach (_transition);
    }
  });

  //
  // callback for editing transitions
  //
  var edit_transition_callback = function (c, e) {
    var connection = c;
    if (c.type == 'Label') {
      connection = c.component;
    }

    _transition = connection;
    var name = _transition.getOverlay ('label').getLabel ();
    $('#transition-name').val (name);

    // FIXME...
    $('#transition-guard-code').val ('//\n// transition guard code\n//\nreturn (false);');
    $('#transition-code').val ('//\n// transition code\n//\nEvent event ("test");\nport.send (event);');

    $('#transition-editor-form').modal ('show');

    e.stopPropagation ();
    e.stopImmediatePropagation ();
    e.preventDefault ();

    return (false);
  }


  //
  // initialize element as connection targets and source.
  //
  var initState = function (el) {
    // initialise draggable elements.
    instance.draggable (el);

    instance.makeSource (el, {
      filter: ".ep",
      anchor: "Continuous",
      connectorStyle: {
        stroke: "#5c96bc", 
        strokeWidth: 2, 
        outlineStroke: "transparent", 
        outlineWidth: 4
      },
      connectionType: "basic",
      extract: {
        "action": "the-action"
      }
    });

    instance.makeTarget (el, {
      dropOptions: {
        hoverClass: "dragHover"
      },
      anchor: "Continuous",
      allowLoopback: true
    });

    return;
  };

  var addInitial = function (x, y, name = "initial") {
    var d = document.createElement ("div");
    d.className = "initial-state";
    id = name;
    if (!name) {
      id = jsPlumbUtil.uuid ();
      name = id.substring (0, 7);
    }
    d.id = id;
    d.innerHTML = "<div class=\"ep\"></div>";
    d.style.left = x + "px";
    d.style.top = y + "px";
    instance.getContainer ().appendChild (d);
    initState (d);

    //
    // bind a listener to add nodes to the state editor
    //
    instance.on (d, "contextmenu", function (e) {
      console.log ("DEBUG: per-initial-state node binding");
      //$('#state-editor-form').modal ('show');

      e.stopPropagation ();
      e.stopImmediatePropagation ();
      e.preventDefault ();

      return (false);
    });

    return d;
  };

  var addTerminal = function (x, y, name = "terminal") {
    var d = document.createElement ("div");
    d.className = "terminal-state-outer";
    id = name;
    if (!name) {
      id = jsPlumbUtil.uuid ();
      name = id.substring (0, 7);
    }
    d.id = id;
    d.innerHTML = "<div class=\"terminal-state-inner\"><div class=\"ep\"></div></div>";
    d.style.left = x + "px";
    d.style.top = y + "px";
    instance.getContainer ().appendChild (d);
    initState (d);

    //
    // bind a listener to add nodes to the state editor
    //
    instance.on (d, "contextmenu", function (e) {
      console.log ("DEBUG: per-terminal-state node binding");
      //$('#state-editor-form').modal ('show');

      e.stopPropagation ();
      e.stopImmediatePropagation ();
      e.preventDefault ();

      return (false);
    });

    return d;
  };

  var addChoice = function (x, y, name = "choice") {
    var d = document.createElement ("div");
    d.className = "choice";
    id = name;
    if (!name) {
      id = jsPlumbUtil.uuid ();
      name = id.substring (0, 7);
    }
    d.id = id;
    d.innerHTML = "<div class=\"choice-label\">" + name + "</div>" + "<div class=\"ep\"></div>";
    d.style.left = x + "px";
    d.style.top = y + "px";
    instance.getContainer ().appendChild (d);
    initState (d);

    //
    // bind a listener to add nodes to the state editor
    //
    instance.on (d, "contextmenu", function (e) {
      console.log ("DEBUG: per-choice node binding");
      //$('#state-editor-form').modal ('show');

      e.stopPropagation ();
      e.stopImmediatePropagation ();
      e.preventDefault ();

      return (false);
    });

    return d;
  };

  var addState = function (x, y, name = null) {
    var d = document.createElement ("div");
    d.className = "w";
    id = name;
    if (!name) {
      id = jsPlumbUtil.uuid ();
      name = id.substring (0, 7);
    }
    d.id = id;
    //d.innerHTML = name + "<div class=\"center\"><div class=\"ep\"></div><div class=\"edit\"></div></div>";
    d.innerHTML = '<span>' + name + "</span><div class=\"ep\"></div>";
    d.style.left = x + "px";
    d.style.top = y + "px";
    instance.getContainer ().appendChild (d);
    initState (d);

    //
    // bind a listener to add nodes to the state editor
    //
    instance.on (d, "contextmenu", function (e) {
      return (edit_state_callback (this, e));
    });

    return d;
  };

  //
  // create state machine nodes
  //
  var create = function (node) {
    //console.log (node);
    if (node.type == 'initial') {
      addInitial (node.x, node.y, node.label);
    }
    else if (node.type == 'state') {
      addState (node.x, node.y, node.label);
    }
    else if (node.type == 'choice') {
      addChoice (node.x, node.y, node.label);
    }
    else if (node.type == 'terminal') {
      addTerminal (node.x, node.y, node.label);
    }
    else {
      console.log (node);
    }

    return;
  }

  //
  // create a connection between state machine nodes
  //
  var connect = function (data) {
    var connection = instance.connect ({source: data.from, target: data.to, type: "basic"});
    connection.getOverlay ('label').setLabel (data.label);

    //
    // bind a contextmenu listener for editing connections
    //
    connection.bind ("contextmenu", function (c, e) {
      return (edit_transition_callback (c, e));
    });

    return;
  };
});

//
// transition:
// from
// to
// name
// guards[]
//
// state:
// x
// y
// name
// width
// height
// entry
// exit
// states[]
// transitions[]
//
// actor:
// x
// y
// name
// width
// height
// ports[]
// state
// actors[]
// bindings[]
//
// port:
// ...
