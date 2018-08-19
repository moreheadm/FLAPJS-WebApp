import Config from 'config.js';

import InputController from './InputController.js';
import SelectionBox from './SelectionBox.js';
import Node from 'graph/Node.js';
import Edge from 'graph/Edge.js';

/*
nodeCreate(targetNode)
nodeDelete(targetNode, prevX, prevY)
nodeDeleteAll(targetNodes, selectedNode, prevX, prevY)
nodeMove(targetNode, nextX, nextY, prevX, prevY)
nodeMoveAll(targetNodes, dx, dy)
nodeAccept(targetNode, nextAccept, prevAccept)
nodeInitial(nextInitial, prevInitial)

edgeCreate(targetEdge)
edgeDelete(targetEdge)
edgeDestination(targetEdge, nextDestination, prevDestination, prevQuad)
edgeMove(targetEdge, nextQuad, prevQuad)
edgeLabel(targetEdge, nextLabel, prevLabel)

tryCreateWhileTrash()
*/
class GraphInputController extends InputController
{
  constructor()
  {
    super();

    this.labelEditor = null;
    this.machineBuilder = null;

    this.prevQuad = {
      radians: 0, length: 0,
      x: 0, y: 0
    };
    this.prevEdgeTo = null;
    this.prevX = 0;
    this.prevY = 0;
    this.prevOffsetX = 0;
    this.prevOffsetY = 0;

    //Make sure this is always false when moving endpoints
    this.isNewEdge = false;

    this.firstEmptyClick = false;
    this.firstEmptyTime = 0;
    this.firstEmptyX = 0;
    this.firstEmptyY = 0;
    this.ghostInitialMarker = null;

    this.selector = new SelectionBox(null);

    this.shouldDestroyPointlessEdges = Config.DEFAULT_SHOULD_DESTROY_POINTLESS_EDGE;
  }

  initialize(app, workspace)
  {
    super.initialize(app, workspace);

    this.selector.graph = this.graph;
    this.labelEditor = app.viewport.labelEditor;
    this.machineBuilder = app.machineBuilder;
  }

  focusOnNode(node)
  {
    //Center workspace at focused node; inverted due to graph-to-screen space
    this.pointer.setOffset(-node.x, -node.y);
  }

  focusOnEdge(edge)
  {
    //Center workspace at focused edge; inverted due to graph-to-screen space
    const center = edge.getCenterPoint();
    this.pointer.setOffset(-center.x, -center.y);
  }

  onInputDown(x, y, target, targetType)
  {
    //Make sure to lose focus on label editors
    if (this.labelEditor.inputElement === document.activeElement)
    {
      this.labelEditor.inputElement.blur();
      return false;
    }

    if (this.selector.hasSelection())
    {
      //Unselect everything is clicked on something other than nodes...
      if (targetType != "node" || !this.selector.isTargetSelected(target))
      {
        this.selector.clearSelection();
      }
    }

    return true;
  }

  onInputMove(x, y, target, targetType) {}
  onInputUp(x, y, target, targetType)
  {
    if (targetType === 'none')
    {
      const dx = x - this.firstEmptyX;
      const dy = y - this.firstEmptyY;
      //If within the time to double tap...
      if (this.firstEmptyClick && (dx * dx + dy * dy) < (Config.CURSOR_RADIUS_SQU * 16) && (Date.now() - this.firstEmptyTime < Config.DOUBLE_TAP_TICKS))
      {
        if (!this.pointer.isTrashMode(x, y))
        {
          //Create state at position
          const node = this.createNode(x, y);

          //Emit event
          this.emit("nodeCreate", node);
        }
        else
        {
          this.emit("tryCreateWhileTrash");
        }

        this.firstEmptyClick = false;
      }
      else
      {
        //This is the first empty click, should wait for another...
        this.firstEmptyClick = true;
        this.firstEmptyTime = Date.now();
        this.firstEmptyX = x;
        this.firstEmptyY = y;
      }

      return true;
    }
  }

  onInputAction(x, y, target, targetType)
  {
    const pointer = this.pointer;
    const trashMode = pointer.isTrashMode(x, y);

    //Makes sure that user cannot toggle state while in trash mode
    if (targetType === 'node')
    {
      if (!trashMode)
      {
        const prev = target.accept;
        const result = !target.accept;
        //Toggle accept for selected node
        target.accept = result;

        //Emit event
        this.emit("nodeAccept", target, result, prev);
        return true;
      }
    }

    //If is in move mode...
    if (pointer.isMoveMode())
    {
      pointer.moveMode = false;
      this.emit("tryCreateWhileTrash");

      return false;
    }
    //If is NOT in move mode...
    else
    {
      //If is in trash mode... capture all events!
      if (trashMode)
      {
        //Click to delete node
        if (targetType === 'node')
        {
          //So that the emitted 'delete' events can use this
          this.prevX = x;
          this.prevY = y;

          //If there exists selected states, delete them all!
          const selector = this.selector;
          if (selector.hasSelection())
          {
            //Delete all selected nodes
            this.deleteSelectedNodes(target);
          }
          else
          {
            //Delete a single node
            this.deleteTargetNode(target);
          }

          return true;
        }
        else if (targetType === 'edge' || targetType === 'endpoint')
        {
          //Delete a single edge
          this.deleteTargetEdge(target);
          return true;
        }
        else
        {
          //Clicked on something you cannot delete
          return false;
        }
      }

      //If not in Trash Mode, then events should pass through to here...
      //Otherwise, ALL events are captured to prevent ALL default behavior.

      //If selected target...
      if (targetType === 'edge')
      {
        //Edit label for selected edge
        this.openLabelEditor(target, x, y);
        return true;
      }
      else
      {
        return false;
      }
    }
  }

  onDragStart(x, y, target, targetType)
  {
    //TODO: sometimes, pointer.target is null when it should not be...
    const pointer = this.pointer;

    //If is in move mode...
    if (pointer.isMoveMode())
    {
      //Make sure it is not in trash mode
      if (pointer.isTrashMode(x, y))
      {
        pointer.moveMode = false;

        this.emit("tryCreateWhileTrash");
        return false;
      }

      //Makes sure that placeholders are not quadratics!
      if (targetType === 'edge' && target.isPlaceholder())
      {
        pointer.moveMode = false;

        //Ignore drag event...
        return false;
      }
      //Moving node (and selected nodes)
      else if (targetType === 'node')
      {
        //target MUST be an instance of Node...
        if (!(target instanceof Node))
          throw new Error("Invalid target " + target + " for type \'" + targetType + "\'. Must be an instance of Node.");

        //Ready to move node(s)...
        this.prevX = x;
        this.prevY = y;
        return true;
      }
      //Moving edge center point
      else if (targetType === 'edge')
      {
        //target MUST be an instance of Edge...
        if (!(target instanceof Edge))
          throw new Error("Invalid target " + target + " for type \'" + targetType + "\'. Must be an instance of Edge.");

        //Makes sure that placeholders are not quadratics!
        if (target.isPlaceholder())
        {
          pointer.moveMode = false;
          return false;
        }

        //Save previous quadratics
        target.copyQuadraticsTo(this.prevQuad);
        //this.prevQuad.x = target.quad.x;
        //this.prevQuad.y = target.quad.y;

        //Ready to move the edge vertex to pointer...
        return true;
      }
      //Moving edge endpoint
      else if (targetType === 'endpoint')
      {
        //target MUST be an instance of Edge...
        if (!(target instanceof Edge))
          throw new Error("Invalid target " + target + " for type \'" + targetType + "\'. Must be an instance of Edge.");

        target.copyQuadraticsTo(this.prevQuad);
        //this.prevQuad.x = target.quad.x;
        //this.prevQuad.y = target.quad.y;
        this.prevEdgeTo = target.to;
        this.isNewEdge = false;

        //Ready to move the edge endpoint to pointer...
        return true;
      }
      //Moving initial marker
      else if (targetType === 'initial')
      {
        this.ghostInitialMarker = pointer;

        //Ready to move the initial marker to another state...
        return true;
      }
      //Moving nothing
      else if (targetType === 'none')
      {
        //Reuse nodal prev pos for graph prev pos
        this.prevX = x;
        this.prevY = y;
        this.prevOffsetX = this.pointer.offsetX;
        this.prevOffsetY = this.pointer.offsetY;

        //Ready to move the graph to pointer...
        return true;
      }
      else
      {
        //All move drag should be handled
        throw new Error("Unknown target type \'" + targetType + "\'.");
      }

      return true;
    }
    //If is NOT in move mode...
    else
    {
      //If action dragged a node...
      if (targetType === 'node')
      {
        if (!this.pointer.isTrashMode(x, y))
        {
          const edge = this.graph.newEdge(target, this.pointer, Config.STR_TRANSITION_DEFAULT_LABEL);

          //Redirect pointer to refer to the edge as the new target
          this.pointer.initial.target = edge;
          this.pointer.initial.targetType = "endpoint";
          this.isNewEdge = true;

          //Reset previous quad values for new proxy edge
          edge.copyQuadraticsTo(this.prevQuad);
          //this.prevQuad.x = 0;
          //this.prevQuad.y = 0;

          //Ready to move proxy edge to pointer...
          this.pointer.moveMode = true;
          return true;
        }
        else
        {
          this.emit("tryCreateWhileTrash");
        }
      }
      else if (targetType === 'endpoint')
      {
        //This is the same as dragging with moveMode endpoint

        //target MUST be an instance of Edge...
        if (!(target instanceof Edge))
          throw new Error("Invalid target " + target + " for type \'" + targetType + "\'. Must be an instance of Edge.");

        this.copyQuadraticsTo(this.prevQuad);
        this.prevEdgeTo = target.to;
        this.isNewEdge = false;

        this.pointer.moveMode = true;

        //Ready to move the edge endpoint to pointer...
        return true;
      }
      //If action dragged nothing...
      else if (targetType === 'none')
      {
        //Begin selection box...
        this.selector.beginSelection(x, y);
        return true;
      }
      else
      {
        //Other action drags are ignored, such as:
        // - Edges
        return false;
      }
    }

    return false;
  }

  onDragMove(x, y, target, targetType)
  {
    const pointer = this.pointer;

    //If is in move mode...
    if (pointer.isMoveMode())
    {
      //Continue to move node(s)
      if (targetType === 'node')
      {
        const selector = this.selector;
        if (selector.hasSelection())
        {
          this.moveMultipleNodesTo(pointer, selector.getSelection(), x, y);
        }
        else
        {
          this.moveNodeTo(pointer, target, x, y);
        }
        return true;
      }
      //Continue to move edge vertex
      else if (targetType === 'edge')
      {
        this.moveEdgeTo(pointer, target, x, y);
        return true;
      }
      //Continue to move edge endpoint
      else if (targetType === 'endpoint')
      {
        this.moveEndpointTo(pointer, target, x, y);
        return true;
      }
      //Continue to move initial
      else if (targetType === 'initial')
      {
        //Move initial marker to node or pointer
        const dst = pointer.getNodeAt(x, y) || pointer;
        this.ghostInitialMarker = dst;
        return true;
      }
      //Continue to move graph
      else if (targetType === 'none')
      {
        //Move graph
        const dx = x - this.prevX;
        const dy = y - this.prevY;
        this.pointer.setOffset(this.pointer.offsetX + dx, this.pointer.offsetY + dy, true);
        return true;
      }
      else
      {
        //All move drag should be handled
        throw new Error("Unknown target type \'" + targetType + "\'.");
      }
    }
    //If is NOT in move mode...
    else
    {
      const selector = this.selector;
      //If the selection box is active...
      if (selector.isActive())
      {
        //Update the selection box
        this.selector.updateSelection(x, y);
        return true;
      }

      //Otherwise, don't do anything. Cause even action drags will become move drags.
    }

    return false;
  }

  onDragStop(x, y, target, targetType)
  {
    const pointer = this.pointer;

    //If is in move mode...
    if (pointer.isMoveMode())
    {
      //If stopped dragging a node...
      if (targetType === 'node')
      {
        //Delete it if withing trash area...
        if (pointer.isTrashMode(x, y))
        {
          //If there exists selected states, delete them all!
          const selector = this.selector;
          if (selector.hasSelection())
          {
            this.deleteSelectedNodes(target);
          }
          else
          {
            //Delete a single node
            this.deleteTargetNode(target);
          }

          return true;
        }
        //If dragged to an empty space (not trash)
        else
        {
          //Do nothing, since should have moved to position
          if (this.selector.hasSelection())
          {
            const dx = x - this.prevX;
            const dy = y - this.prevY;
            this.emit("nodeMoveAll", this.selector.getSelection(), dx, dy);
          }
          else
          {
            this.emit("nodeMove", target, x, y, this.prevX, this.prevY);
          }
          return true;
        }
      }
      //If stopped dragging a edge...
      else if (targetType === 'edge')
      {
        //Delete it if withing trash area...
        if (pointer.isTrashMode(x, y))
        {
          this.deleteTargetEdge(target);
        }
        else
        {
          //Do nothing, since should have moved to position
          this.emit("edgeMove", target, target.getQuadratic(), this.prevQuad);
        }
        return true;
      }
      //If stopped dragging a endpoint...
      else if (targetType === 'endpoint')
      {
        //Delete it if withing trash area...
        if (pointer.isTrashMode(x, y))
        {
          this.deleteTargetEdge(target);
          return true;
        }
        //If hovering over a node...
        else if (target.to instanceof Node)
        {
          const targetNode = target.to;

          //Look for an existing edge with similar from and to
          for(const edge of this.graph.edges)
          {
            if (edge !== target && edge.from === target.from && edge.to === pointer.target)
            {
              let result = edge.label.split(",");
              if (target.label !== Config.STR_TRANSITION_DEFAULT_LABEL)
              {
                result = result.concat(target.label.split(","));
              }

              //Allow the user to edit the merged labels
              this.openLabelEditor(edge, x, y, result.join(","));

              //Delete the merged label
              this.graph.deleteEdge(target);
              return true;
            }
          }

          //If the edge has changed...
          if (this.prevEdgeTo !== null)
          {
            //Make sure that it's previous edge was not null
            target._to = this.prevEdgeTo;
            //Finalize the edge (trigger the event)
            target.to = targetNode;
          }

          //If the cursor returns to the state after leaving it...
          if (target.isSelfLoop())
          {
            //Make it a self loop
            const dx = target.from.x - x;
            const dy = target.from.y - y;
            const angle = Math.atan2(dy, dx);
            target.makeSelfLoop(angle);
          }
          //Otherwise, maintain original curve
          else
          {
            target.copyQuadraticsFrom(this.prevQuad);
          }

          if (this.isNewEdge)
          {
            this.isNewEdge = false;

            //Emit event
            this.emit("edgeCreate", target);
          }
          else if (this.prevEdgeTo !== null)
          {
            //Emit event
            this.emit("edgeDestination", target, target.to, this.prevEdgeTo, this.prevQuad);
          }

          //Bend away if there is another edge not bent with the same src/dst
          for(const edge of this.graph.edges)
          {
            if (edge.isQuadratic()) continue;
            if ((edge.to === target.from && edge.from === target.to))
            {
              const HALFPI = Math.PI / 2;
              target.setQuadVector(HALFPI, Config.PARALLEL_EDGE_HEIGHT);
              edge.setQuadVector(HALFPI, Config.PARALLEL_EDGE_HEIGHT);
            }
          }

          //Open label editor if default edge...
          if (target.label === Config.STR_TRANSITION_DEFAULT_LABEL)
          {
            this.openLabelEditor(target, x, y);
          }
          return true;
        }
        //If hovering over anything else...
        else
        {
          //Destroy any edge that no longer have a destination
          if (this.shouldDestroyPointlessEdges)
          {
            this.graph.deleteEdge(target);
            return true;
          }
          //Keep edges as placeholders (used in DFA's)
          else
          {
            target.makePlaceholder();

            //Open label editor if default edge...
            if (target.label === Config.STR_TRANSITION_DEFAULT_LABEL)
            {
              this.openLabelEditor(target, x, y);
            }
            return true;
          }
        }
      }
      else if (targetType === 'initial')
      {
        //If valid initial object to mark...
        if (this.ghostInitialMarker instanceof Node)
        {
          const prevInitial = this.graph.getStartNode();

          //Set the new object as the initial node
          this.graph.setStartNode(this.ghostInitialMarker);

          //Emit event
          this.emit("nodeInitial", this.ghostInitialMarker, prevInitial);
        }

        //Reset ghost initial marker
        this.ghostInitialMarker = null;
        return true;
      }
      else if (targetType === 'none')
      {
        //Do nothing. It should already be moved.
        return true;
      }
      else
      {
        //All move drag should be handled
        throw new Error("Unknown target type \'" + targetType + "\'.");
      }
    }
    //If is NOT in move mode...
    else
    {
      //If was trying to select...
      if (this.selector.isActive())
      {
        //Stop selecting stuff, fool.
        this.selector.endSelection(x, y);
        return true;
      }
    }

    return false;
  }

  createNode(x, y)
  {
    const newNodeLabel = this.machineBuilder.getLabeler().getNextDefaultNodeLabel();
    const node = this.graph.newNode(x, y, newNodeLabel);
    node.x = x || (Math.random() * Config.SPAWN_RADIUS * 2) - Config.SPAWN_RADIUS;
    node.y = y || (Math.random() * Config.SPAWN_RADIUS * 2) - Config.SPAWN_RADIUS;
    return node;
  }

  deleteSelectedNodes(selectedNode)
  {
    const selector = this.selector;
    const selection = selector.getSelection().slice();

    //Remove from graph
    for(const node of selection)
    {
      this.graph.deleteNode(node);
    }

    //Remove from selection
    selector.clearSelection();

    //Emit event
    this.emit("nodeDeleteAll", selection, selectedNode, this.prevX, this.prevY);
  }

  deleteTargetNode(target)
  {
    this.graph.deleteNode(target);

    //Emit event
    this.emit("nodeDelete", target, this.prevX, this.prevY);
  }

  deleteTargetEdge(target)
  {
    this.graph.deleteEdge(target);

    //Emit event
    this.emit("edgeDelete", target);
  }

  moveNodeTo(pointer, node, x, y)
  {
    for(const other of this.graph.nodes)
    {
      //Update node collision
      if (node === other) continue;

      const dx = x - other.x;
      const dy = y - other.y;
      const angle = Math.atan2(dy, dx);

      const diameter = (Config.NODE_RADIUS * 2);
      const nextDX = other.x + (Math.cos(angle) * diameter) - x;
      const nextDY = other.y + (Math.sin(angle) * diameter) - y;

      if (dx * dx + dy * dy < Config.NODE_RADIUS_SQU * 4)
      {
        x += nextDX;
        y += nextDY;
      }
    }

    node.x = x;
    node.y = y;
  }

  moveMultipleNodesTo(pointer, nodes, x, y)
  {
    //Moves all nodes by difference between initial position with passed-in x and y
    const dx = x - pointer.initial.x;
    const dy = y - pointer.initial.y;
    for(const node of nodes)
    {
      node.x += dx;
      node.y += dy;
    }

    //Updates initial position to passed-in x and y to maintain relative position
    pointer.initial.x = x;
    pointer.initial.y = y;
  }

  moveEdgeTo(pointer, edge, x, y)
  {
    edge.setQuadraticByPosition(x, y);
  }

  moveEndpointTo(pointer, edge, x, y)
  {
    //Get ONLY node at x and y (cannot use hover target, since it is not ONLY nodes)
    const dst = pointer.getNodeAt(x, y) || pointer;
    edge._to = dst;

    //If the cursor returns to the state after leaving it...
    if (edge.isSelfLoop())
    {
      //Make it a self loop
      const dx = edge.from.x - x;
      const dy = edge.from.y - y;
      const angle = Math.atan2(dy, dx);
      edge.makeSelfLoop(angle);
    }
    //Otherwise, maintain original curve
    else
    {
      edge.copyQuadraticsFrom(this.prevQuad);
    }
  }

  openLabelEditor(target, x, y, placeholder=null)
  {
    const prevLabel = placeholder || target.label;
    this.labelEditor.openEditor(target, placeholder, () => {
      const label = target.label;
      if (prevLabel.length > 0 && label != prevLabel)
      {
        this.emit("edgeLabel", target, label, prevLabel);
      }
    });
  }
}

export default GraphInputController;
