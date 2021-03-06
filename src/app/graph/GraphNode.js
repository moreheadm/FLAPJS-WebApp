import GraphElement from 'graph/GraphElement.js';

class GraphNode extends GraphElement
{
  constructor(id, x, y)
  {
    super(id);

    this.x = x;
    this.y = y;

    this._label = "";
  }

  setNodeLabel(label)
  {
    this._label = label;
    return this;
  }

  getNodeLabel()
  {
    return this._label;
  }

  getNodeSize()
  {
    return 16;
  }

  //Override
  getHashString(usePosition=true)
  {
    if (usePosition)
    {
      return super.getHashString(usePosition) + ":" + Math.floor(this.x) + "," + Math.floor(this.y) + "." + this._label;
    }
    else
    {
      return super.getHashString(usePosition) + ":" + this._label;
    }
  }
}

export default GraphNode;
