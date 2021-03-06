import AbstractModule from 'modules/abstract/AbstractModule.js';

import Notifications from 'system/notification/Notifications.js';

import OverviewPanel from './panels/overview/OverviewPanel.js';
import TestingPanel from './panels/testing/TestingPanel.js';
import AnalysisPanel from './panels/analysis/AnalysisPanel.js';
import AboutPanel from './panels/about/AboutPanel.js';

import InputController from './controller/InputController.js';
import GraphController from './controller/GraphController.js';
import MachineController from './controller/MachineController.js';

import FSAGraphRenderer from './renderer/FSAGraphRenderer.js';
import FSAGraphOverlayRenderer from './renderer/FSAGraphOverlayRenderer.js';
import ViewportRenderer from './renderer/ViewportRenderer.js';

import GraphLayout from './graph/GraphLayout.js';
import EventManager from './EventManager.js';
import LabelEditor from './editor/LabelEditor.js';
import TestingManager from './testing/TestingManager.js';

import StringTester from 'experimental/panels/test/StringTester.js';

import FSAGraphExporter from './exporter/FSAGraphExporter.js';
import JFLAPGraphExporter from './exporter/JFLAPGraphExporter.js';

const VERSION = "0.0.1";
const PANELS = [AboutPanel, TestingPanel, OverviewPanel, AnalysisPanel];
const EXPORTERS = [
  new FSAGraphExporter(),
  new JFLAPGraphExporter()
];

class FSAModule extends AbstractModule
{
  constructor(app)
  {
    super(app);

    this._workspace = null;

    this._inputController = new InputController(this, app.getInputAdapter());
    this._graphController = new GraphController(this);
    this._machineController = new MachineController(this);

    //Deprecated (should be anyways)
    this._eventManager = new EventManager(app.getUndoManager());
    //Deprecated
    this._testingManager = new TestingManager();
    //Use this instead
    this._tester = new StringTester();
  }

  //Override
  initialize(app)
  {
    const viewport = app.viewport;
    const workspace = app.workspace;

    this._workspace = workspace;

    super.initialize(app);

    this._eventManager.initialize(this);

    this._testingManager.initialize(this, viewport);

    //Notify on create in delete mode
    const tryCreateWhileTrash = () => {
      if (this._inputController.isTrashMode())
      {
        Notifications.addMessage(I18N.toString("message.warning.cannotmodify"), "warning", "tryCreateWhileTrash");
      }
    };
    this._graphController.on("tryCreateWhileTrash", tryCreateWhileTrash);
  }

  //Override
  destroy(app)
  {
    this._testingManager.destroy();

    this._eventManager.destroy();

    super.destroy(app);
  }

  //Override
  update(app)
  {
    super.update(app);
  }

  getGraph()
  {
    return this._graphController.getGraph();
  }

  getTestingManager()
  {
    return this._testingManager;
  }

  getDefaultGraphLayout()
  {
    return GraphLayout;
  }

  getLabelEditor()
  {
    return LabelEditor;
  }

  //Override
  getRenderer(renderLayer)
  {
    switch(renderLayer)
    {
      case "graph":
        return FSAGraphRenderer;
      case "graphoverlay":
        return FSAGraphOverlayRenderer;
      case "viewport":
        return ViewportRenderer;
    }
    return null;
  }
  //Override
  getInputController() { return this._inputController; }
  //Override
  getGraphController() { return this._graphController; }
  //Override
  getMachineController() { return this._machineController; }
  //Override
  getGraphExporters() { return EXPORTERS; }
  //Override
  getModuleVersion() { return VERSION; }
  //Override
  getModulePanels() { return PANELS; }
  //Override
  getModuleName() { return "fsa"; }
  //Override
  getLocalizedModuleName() { return this._machineController.getMachineType(); }
}
export default FSAModule;
