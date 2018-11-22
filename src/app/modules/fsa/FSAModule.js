import OverviewPanel from './panels/overview/OverviewPanel.js';
import TestingPanel from './panels/testing/TestingPanel.js';
import AnalysisPanel from './panels/analysis/AnalysisPanel.js';

import NodalGraph from 'graph/NodalGraph.js';

import FSABuilder from './builder/FSABuilder.js';

const PANELS = [TestingPanel, OverviewPanel, AnalysisPanel];

class FSAModule
{
  constructor(app)
  {
    this._graph = new NodalGraph();
    this._machineBuilder = new FSABuilder(this._graph);
  }

  initialize(app)
  {
    this._machineBuilder.initialize(app);
  }

  destroy(app)
  {
    this._machineBuilder.destroy();
  }

  getGraph()
  {
    return this._graph;
  }

  getMachineBuilder()
  {
    return this._machineBuilder;
  }

  getLabelFormatter()
  {
    return this._machineBuilder.formatAlphabetString.bind(this._machineBuilder);
  }

  getPanels()
  {
    return PANELS;
  }

  getName()
  {
    return "fsa";
  }
}
export default FSAModule;
