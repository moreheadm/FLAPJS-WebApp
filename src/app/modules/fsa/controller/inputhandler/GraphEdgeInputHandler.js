import GraphElementInputHandler from './GraphElementInputHandler.js';

class GraphEdgeInputHandler extends GraphElementInputHandler
{
  constructor()
  {
    super("edge");
  }

  //Override
  onAction(inputController, graphController, pointer, target)
  {
    if (inputController.isTrashMode())
    {
      //Delete a single edge
      graphController.deleteTargetEdge(target);
    }
    else
    {
      //Edit label for selected edge
      graphController.openLabelEditor(target, pointer.x, pointer.y);
    }
    return true;
  }

  //Override
  onDragStart(inputController, graphController, pointer, target)
  {
    //Makes sure that placeholders are not quadratics!
    if (target.isPlaceholder())
    {
      return false;
    }

    //Save previous quadratics
    const targetQuad = target.getQuadratic();
    graphController.prevQuad.radians = targetQuad.radians;
    graphController.prevQuad.length = targetQuad.length;

    //Ready to move the edge vertex to pointer...
    return true;
  }

  //Override
  onDragMove(inputController, graphController, pointer, target)
  {
    graphController.moveEdgeTo(pointer, target, pointer.x, pointer.y);
    return true;
  }

  //Override
  onDragStop(inputController, graphController, pointer, target)
  {
    const graph = graphController.getGraph();

    //Delete it if withing trash area...
    if (inputController.isTrashMode())
    {
      graphController.deleteTargetEdge(target);
    }
    else
    {
      //Do nothing, since should have moved to position
      graphController.emit("edgeMove", graph, target, target.getQuadratic(), graphController.prevQuad);
    }
    return true;
  }
}

export default GraphEdgeInputHandler;
