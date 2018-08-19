import Config from 'config.js';

import Eventable from 'util/Eventable.js';

import GraphPointer from './GraphPointer.js';

const PINCH_SENSITIVITY = 1 / 300.0;

class InputController
{
  constructor()
  {
    this.graph = null;
    this.workspace = null;
    this.labelEditor = null;

    this.pointer = new GraphPointer(null);

    this.cursor = {
      _mousemove: null,
      _mouseup: null,
      _touchmove: null,
      _touchend: null,
      _timer: null
    };

    //Swap left to right clicks and vice versa on anything else but Macs
    this._swapMouseScheme = !navigator.platform.startsWith("Mac");

    this.prevPinchDist = 0;
    this.pinchDist = 0;

    this.onContextMenu = this.onContextMenu.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onWheel = this.onWheel.bind(this);
  }

  initialize(app, workspace)
  {
    //Set the graph
    this.graph = app.graph;
    this.pointer.graph = this.graph;
    this.labelEditor = app.viewport.labelEditor;

    //Prepare the workspace
    this.workspace = workspace;

    //Process mouse handlers
    this.workspace.addEventListener('mousedown', this.onMouseDown);
    this.workspace.addEventListener('mousemove', this.onMouseMove);
    this.workspace.addEventListener('contextmenu', this.onContextMenu);
    this.workspace.addEventListener('wheel', this.onWheel);

    //Process touch handlers
    this.workspace.addEventListener('touchstart', this.onTouchStart);
    this.workspace.addEventListener('touchmove', this.onTouchMove);
  }

  destroy()
  {
    this.clearListeners();

    //Process mouse handlers
    this.workspace.removeEventListener('mousedown', this.onMouseDown);
    this.workspace.removeEventListener('mousemove', this.onMouseMove);
    this.workspace.removeEventListener('contextmenu', this.onContextMenu);
    this.workspace.removeEventListener('wheel', this.onWheel);

    //Process touch handlers
    this.workspace.removeEventListener('touchstart', this.onTouchStart);
    this.workspace.removeEventListener('touchmove', this.onTouchMove);
  }

  update()
  {
    //Smooth transition offset
    this.pointer.updateOffset();
  }

  setMouseActionMode(isLeftMouse)
  {
    this._swapMouseScheme = isLeftMouse;
  }

  getMouseActionMode()
  {
    return this._swapMouseScheme;
  }

  isUsingTouch()
  {
    return this.cursor._touchmove || this.cursor._touchend;
  }

  onContextMenu(e)
  {
    e.stopPropagation();
    e.preventDefault();

    return false;
  }

  onWheel(e)
  {
    e.stopPropagation();
    e.preventDefault();

    this.pinchDist = e.deltaY * Config.SCROLL_SENSITIVITY;
    this.pointer.setScale(this.pointer.scale + this.pinchDist);
  }

  onTouchMove(e)
  {
    const mouse = getMousePosition(this.workspace, e.touches[0]);
    this.pointer.setPosition(mouse.x, mouse.y);
  }

  onTouchStart(e)
  {
    if (e.changedTouches.length == 2)
    {
    /*
      e.stopPropagation();
      e.preventDefault();

      document.activeElement.blur();
      this.workspace.focus();

      if (this.cursor._touchmove)
      {
        document.removeEventListener('touchmove', this.cursor._touchmove);
        this.cursor._touchmove = null;
      }
      if (this.cursor._touchend)
      {
        document.removeEventListener('touchend', this.cursor._touchend);
        this.cursor._touchend = null;
      }

      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      this.prevPinchDist = Math.hypot(
        touch1.pageX - touch2.pageX,
        touch1.pageY - touch2.pageY);

      this.cursor._touchmove = this.onPinchMove.bind(this);
      this.cursor._touchend = this.onPinchEnd.bind(this);

      document.addEventListener('touchmove', this.cursor._touchmove);
      document.addEventListener('touchend', this.cursor._touchend);
      */

      return false;
    }

    if (e.touches.length == 1)
    {
      e.stopPropagation();
      e.preventDefault();

      document.activeElement.blur();
      this.workspace.focus();

      const touch = e.changedTouches[0];

      if (this.cursor._touchmove)
      {
        document.removeEventListener('touchmove', this.cursor._touchmove);
        this.cursor._touchmove = null;
      }
      if (this.cursor._touchend)
      {
        document.removeEventListener('touchend', this.cursor._touchend);
        this.cursor._touchend = null;
      }

      if (this.doInputDown(touch.clientX, touch.clientY, false/*this._swapMouseScheme*/))//default false
      {
        this.cursor._touchmove = this.onTouchStartAndMove.bind(this);
        this.cursor._touchend = this.onTouchStartAndEnd.bind(this);

        document.addEventListener('touchmove', this.cursor._touchmove);
        document.addEventListener('touchend', this.cursor._touchend);
      }
    }
    else
    {
      //Do nothin.
    }
  }

  onPinchMove(e)
  {
    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    this.pinchDist = Math.hypot(
      touch1.pageX - touch2.pageX,
      touch1.pageY - touch2.pageY);

    this.pointer.setScale(this.pinchDist * PINCH_SENSITIVITY);

    return false;
  }

  onPinchEnd()
  {
    if (this.cursor._touchmove)
    {
      document.removeEventListener('touchmove', this.cursor._touchmove);
      this.cursor._touchmove = null;
    }
    if (this.cursor._touchend)
    {
      document.removeEventListener('touchend', this.cursor._touchend);
      this.cursor._touchend = null;
    }

    return false;
  }

  onTouchStartAndEnd(e)
  {
    const touch = e.changedTouches[0];

    if (this.cursor._touchmove)
    {
      document.removeEventListener('touchmove', this.cursor._touchmove);
      this.cursor._touchmove = null;
    }
    if (this.cursor._touchend)
    {
      document.removeEventListener('touchend', this.cursor._touchend);
      this.cursor._touchend = null;
    }

    this.doInputDownAndUp(touch.clientX, touch.clientY);

    return false;
  }

  onTouchStartAndMove(e)
  {
    const touch = e.changedTouches[0];
    this.doInputDownAndMove(touch.clientX, touch.clientY);

    return false;
  }

  onMouseMove(e)
  {
    const pointer = this.pointer;
    const mouse = getMousePosition(this.workspace, e.clientX, e.clientY);
    this.pointer.setPosition(mouse.x, mouse.y);

    //Update target
    this.pointer.updateTarget();
    if (this.pointer.target != null)
    {
      document.body.style.cursor = "pointer";
    }
    else
    {
      document.body.style.cursor = "auto";
    }
  }

  onMouseDown(e)
  {
    e.stopPropagation();
    e.preventDefault();

    document.activeElement.blur();
    this.workspace.focus();

    if (this.cursor._mousemove)
    {
      document.removeEventListener('mousemove', this.cursor._mousemove);
      this.cursor._mousemove = null;
    }
    if (this.cursor._mouseup)
    {
      document.removeEventListener('mouseup', this.cursor._mouseup);
      this.cursor._mouseup = null;
    }

    let moveMode = (e.button == 2) || e.ctrlKey;
    if (this.doInputDown(e.clientX, e.clientY, this._swapMouseScheme ? !moveMode : moveMode))
    {
      this.cursor._mousemove = this.onMouseDownAndMove.bind(this);
      this.cursor._mouseup = this.onMouseDownAndUp.bind(this);

      document.addEventListener('mousemove', this.cursor._mousemove);
      document.addEventListener('mouseup', this.cursor._mouseup);
    }
  }

  onMouseDownAndMove(e)
  {
    e.stopPropagation();
    e.preventDefault();

    this.doInputDownAndMove(e.clientX, e.clientY);

    return false;
  }

  onMouseDownAndUp(e)
  {
    e.stopPropagation();
    e.preventDefault();

    if (this.cursor._mousemove)
    {
      document.removeEventListener('mousemove', this.cursor._mousemove);
      this.cursor._mousemove = null;
    }
    if (this.cursor._mouseup)
    {
      document.removeEventListener('mouseup', this.cursor._mouseup);
      this.cursor._mouseup = null;
    }

    this.doInputDownAndUp(e.clientX, e.clientY);

    return false;
  }

  doInputDown(x, y, moveMode)
  {
    const pointer = this.pointer;
    const mouse = getMousePosition(this.workspace, x, y);
    pointer.moveMode = moveMode;//If right click
    pointer.setInitialPosition(mouse.x, mouse.y);

    //Check whether to accept the start of input...
    this.onInputDown(pointer.x, pointer.y,
        pointer.initial.target, pointer.initial.targetType);

    this.cursor._timer = setTimeout(() => {
      if (pointer.isWaitingForMoveMode())
      {
        pointer.moveMode = true;//!(this._swapMouseScheme ? !moveMode : moveMode);//default true
      }
    }, Config.LONG_TAP_TICKS);

    return true;
  }

  doInputDownAndMove(x, y)
  {
    const pointer = this.pointer;
    const mouse = getMousePosition(this.workspace, x, y);
    pointer.setPosition(mouse.x, mouse.y);

    if (!pointer.dragging)
    {
      if (pointer.getDistanceSquToInitial() > pointer.getDraggingRadiusForTarget())
      {
        //Start drag!
        pointer.dragging = true;
        this.onDragStart(pointer.x, pointer.y,
            pointer.initial.target, pointer.initial.targetType);
      }
      else
      {
        //Still a click or hold
        pointer.dragging = false;
      }
    }
    else
    {
      //Continue to drag...
      this.onDragMove(pointer.x, pointer.y,
          pointer.initial.target, pointer.initial.targetType);
    }

    this.onInputMove(pointer.x, pointer.y,
        pointer.initial.target, pointer.initial.targetType);
  }

  doInputDownAndUp(x, y)
  {
    if (this.cursor._timer)
    {
      clearTimeout(this.cursor._timer);
      this.cursor._timer = null;
    }

    const pointer = this.pointer;
    pointer.updateTarget();

    if (pointer.dragging)
    {
      //Stop drag!
      this.onDragStop(pointer.x, pointer.y,
          pointer.initial.target, pointer.initial.targetType);
    }
    else
    {
      //Tap!
      this.onInputAction(pointer.x, pointer.y,
          pointer.initial.target, pointer.initial.targetType);
    }

    this.onInputUp(pointer.x, pointer.y,
        pointer.initial.target, pointer.initial.targetType);
  }

  //Returns true if should act on input, false to ignore remaining click events
  onInputDown(x, y, target, targetType)
  {
    return true;
  }

  onInputMove(x, y, target, targetType) {}
  onInputUp(x, y, target, targetType) {}
  onInputAction(x, y, target, targetType) {}

  onDragStart(x, y, target, targetType) {}
  onDragMove(x, y, target, targetType) {}
  onDragStop(x, y, target, targetType) {}
}
//Mixin Eventable
Eventable.mixin(InputController);

function getMousePosition(svg, x, y)
{
  const ctm = svg.getScreenCTM();
  return {
    x: (x - ctm.e) / ctm.a,
    y: (y - ctm.f) / ctm.d
  };
}

export default InputController;
