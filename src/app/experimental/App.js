import React from 'react';
import { hot } from 'react-hot-loader/root';
import './App.css';

import DrawerView, { DRAWER_SIDE_RIGHT, DRAWER_SIDE_BOTTOM, DRAWER_BAR_DIRECTION_VERTICAL, DRAWER_BAR_DIRECTION_HORIZONTAL } from 'experimental/drawer/DrawerView.js';
import ToolbarView from 'experimental/toolbar/ToolbarView.js';
import WorkspaceView from 'experimental/workspace/WorkspaceView.js';
import ViewportView from 'experimental/viewport/ViewportView.js';
import TooltipView, { ONESHOT_MODE } from 'experimental/tooltip/TooltipView.js';
import UploadDropZone from 'experimental/components/UploadDropZone.js';

import ExportPanel from 'experimental/menus/export/ExportPanel.js';
import OptionPanel from 'experimental/menus/option/OptionPanel.js';

import EditPane from 'experimental/EditPane.js';
import TapePane from 'experimental/TapePane.js';

import TestingPanel from 'experimental/panels/test/TestingPanel.js';

import ToolbarButton, {TOOLBAR_CONTAINER_TOOLBAR, TOOLBAR_CONTAINER_MENU } from 'experimental/toolbar/ToolbarButton.js';
import ToolbarDivider from 'experimental/toolbar/ToolbarDivider.js';
import ToolbarUploadButton from 'experimental/toolbar/ToolbarUploadButton.js';
import PageEmptyIcon from 'experimental/iconset/PageEmptyIcon.js';
import UndoIcon from 'experimental/iconset/UndoIcon.js';
import RedoIcon from 'experimental/iconset/RedoIcon.js';
import UploadIcon from 'experimental/iconset/UploadIcon.js';
import DownloadIcon from 'experimental/iconset/DownloadIcon.js';
import BugIcon from 'experimental/iconset/BugIcon.js';
import WorldIcon from 'experimental/iconset/WorldIcon.js';
import HelpIcon from 'experimental/iconset/HelpIcon.js';
import SettingsIcon from 'experimental/iconset/SettingsIcon.js';

import * as UserUtil from 'experimental/UserUtil.js';
import AppSaver from 'experimental/AppSaver.js';

import HotKeyManager, {CTRL_KEY, ALT_KEY, SHIFT_KEY} from 'experimental/hotkey/HotKeyManager.js';
import HotKeyView from 'experimental/hotkey/HotKeyView.js';

import Notifications from 'system/notification/Notifications.js';
import NotificationView from 'system/notification/components/NotificationView.js';

import InputAdapter from 'system/inputadapter/InputAdapter.js';
import UndoManager from 'system/undomanager/UndoManager.js';
import LocalSave from 'system/localsave/LocalSave.js';

//import Module from 'modules/default/DefaultModule.js';
import Module from 'modules/fsa/FSAModule.js';
import StringTester from 'experimental/panels/test/StringTester.js';

const HELP_URL = "https://github.com/flapjs/FLAPJS-WebApp/blob/master/docs/HELP.md";

class App extends React.Component
{
  constructor(props)
  {
    super(props);

    this._workspace = null;
    this._toolbar = null;
    this._drawer = null;
    this._viewport = null;

    //These need to be initialized before module
    this._inputAdapter = new InputAdapter();
    this._inputAdapter.getViewport()
      .setMinScale(0.1)
      .setMaxScale(10)
      .setOffsetDamping(0.4);
    this._undoManager = new UndoManager();

    this._hotKeyManager = new HotKeyManager();
    this._hotKeyManager.registerHotKey("Export to PNG", [CTRL_KEY, 'KeyP'], () => {console.log("Export!")});
    this._hotKeyManager.registerHotKey("Save as JSON", [CTRL_KEY, 'KeyS'], () => {console.log("Save!")});
    this._hotKeyManager.registerHotKey("New", [CTRL_KEY, 'KeyN'], () => {console.log("New!")});
    this._hotKeyManager.registerHotKey("Undo", [CTRL_KEY, 'KeyZ'], () => {console.log("Undo!")});
    this._hotKeyManager.registerHotKey("Redo", [CTRL_KEY, SHIFT_KEY, 'KeyZ'], () => {console.log("Redo!")});

    this._saver = new AppSaver(this);

    this._module = new Module(this);
    this._tester = new StringTester();

    this._init = false;

    this.state = {
      hide: false
    };

    this._mediaQuerySmallWidthList = window.matchMedia("only screen and (max-width: 400px)");
    this._mediaQuerySmallHeightList = window.matchMedia("only screen and (min-height: 400px)");

    //Notifications.addMessage("Welcome to Flap.js");
  }

  //Override
  componentDidMount()
  {
    const workspaceDOM = this._workspace.ref;
    this._inputAdapter.initialize(workspaceDOM);
    this._module.initialize(this);
    this._hotKeyManager.initialize();

    LocalSave.registerHandler(this._saver);
    LocalSave.initialize();

    this._init = true;
  }

  //Override
  componentWillUnmount()
  {
    this._init = false;

    LocalSave.unregisterHandler(this._saver);
    LocalSave.terminate();

    this._hotKeyManager.destroy();
    this._module.destroy(this);
    this._inputAdapter.destroy();
  }

  get workspace() { return this._workspace; }
  get viewport() { return this._inputAdapter.getViewport(); }
  getCurrentModule() { return this._module; }
  getInputAdapter() { return this._inputAdapter; }
  getUndoManager() { return this._undoManager; }
  getHotKeyManager() { return this._hotKeyManager; }

  //Override
  render()
  {
    if (this._init)
    {
      this._inputAdapter.update();
      this._module.update(this);

      //Disable hotkeys when graph is not in view
      this._hotKeyManager.setEnabled(
        !(this._toolbar && this._toolbar.isBarOpen()) &&
        !(this._drawer && this._drawer.isDrawerOpen() &&
          this._drawer.isDrawerFullscreen())
        );
    }

    const hasSmallWidth = this._mediaQuerySmallWidthList.matches;
    const hasSmallHeight = this._mediaQuerySmallHeightList.matches;
    const isFullscreen = this.state.hide;

    const undoManager = this._undoManager;
    const viewport = this._inputAdapter.getViewport();
    const inputController = this._module.getInputController();
    const graphController = this._module.getGraphController();
    const machineController = this._module.getMachineController();
    const graphImporter = this._module.getGraphImporter();
    const inputActionMode = inputController.isActionMode(graphController);

    const GRAPH_RENDER_LAYER = "graph";
    const GRAPH_OVERLAY_RENDER_LAYER = "graphoverlay";
    const VIEWPORT_RENDER_LAYER = "viewport";
    const GraphRenderer = this._module.getRenderer(GRAPH_RENDER_LAYER);
    const GraphOverlayRenderer = this._module.getRenderer(GRAPH_OVERLAY_RENDER_LAYER);
    const ViewportRenderer = this._module.getRenderer(VIEWPORT_RENDER_LAYER);

    return (
      <div className="app-container">

        <ToolbarView ref={ref=>this._toolbar=ref} className="app-bar"
          menus={[ExportPanel, OptionPanel]}
          menuProps={{currentModule: this._module}}
          hide={isFullscreen}>

          <ToolbarButton title="New" icon={PageEmptyIcon}
            onClick={() => UserUtil.userClearGraph(this, false, () => this._toolbar.closeBar())}/>
          <ToolbarUploadButton title="Upload" icon={UploadIcon} accept={graphImporter.getImportFileTypes().join(",")}
            onUpload={file => {
              graphImporter.importFile(file, this._module)
                .catch((e) => {
                  Notifications.addErrorMessage("ERROR: Unable to load invalid JSON file.", "errorUpload");
                  console.error(e);
                })
                .finally(() => {
                  this._toolbar.closeBar();
                });
            }}/>
          <ToolbarButton title="Undo" icon={UndoIcon} containerOnly={TOOLBAR_CONTAINER_TOOLBAR}
            disabled={!undoManager.canUndo()}
            onClick={()=>undoManager.undo()}/>
          <ToolbarButton title="Redo" icon={RedoIcon} containerOnly={TOOLBAR_CONTAINER_TOOLBAR}
            disabled={!undoManager.canRedo()}
            onClick={()=>undoManager.redo()}/>
          <ToolbarButton title={I18N.toString("component.exporting.title")} icon={DownloadIcon}
            onClick={()=>this._toolbar.setCurrentMenu(0)}
            disabled={graphController.getGraph().isEmpty()}/>
          <ToolbarDivider/>
          <ToolbarButton title="Report a Bug" icon={BugIcon} containerOnly={TOOLBAR_CONTAINER_MENU}/>
          <ToolbarButton title="Language" icon={WorldIcon} containerOnly={TOOLBAR_CONTAINER_MENU}/>
          <ToolbarButton title="Help" icon={HelpIcon}
            onClick={()=>window.open(HELP_URL, '_blank')}/>
          <ToolbarButton title={I18N.toString("component.options.title")} icon={SettingsIcon} containerOnly={TOOLBAR_CONTAINER_MENU}
            onClick={()=>this._toolbar.setCurrentMenu(1)}/>

        </ToolbarView>

        <DrawerView ref={ref=>this._drawer=ref} className="app-content"
          panels={this._module.getModulePanels().concat([TestingPanel])}
          panelProps={{currentModule: this._module, app: this}}
          side={hasSmallWidth ? DRAWER_SIDE_BOTTOM : DRAWER_SIDE_RIGHT}
          direction={hasSmallHeight ? DRAWER_BAR_DIRECTION_VERTICAL : DRAWER_BAR_DIRECTION_HORIZONTAL}
          hide={isFullscreen}>
          <UploadDropZone>
            <div className="viewport">

              <TooltipView mode={ONESHOT_MODE} visible={/* For the initial fade-in animation */this._init && graphController.getGraph().isEmpty()}>
                <label>{I18N.toString("message.workspace.empty")}</label>
                <label>{"If you need help, try the \'?\' at the top."}</label>
                <label>{"Or you can choose to do nothing."}</label>
                <label>{"I can't do anything about that."}</label>
                <label>{"You really should consider doing something though, for the sake of both of us."}</label>
                <label>{"Of course, it is your free will."}</label>
                <label>{"You do you."}</label>
                <label>{"Please do something."}</label>
                <label>{"I need my job."}</label>
                <label>{I18N.toString("message.workspace.empty")}</label>
              </TooltipView>

              <WorkspaceView ref={ref=>this._workspace=ref} viewport={viewport}>
                {/* Graph origin crosshair */
                  !graphController.getGraph().isEmpty() &&
                  <React.Fragment>
                    <line className="graph-ui" x1="0" y1="-5" x2="0" y2="5" stroke="var(--color-viewport-back-detail)"/>
                    <line className="graph-ui" x1="-5" y1="0" x2="5" y2="0" stroke="var(--color-viewport-back-detail)"/>
                  </React.Fragment>}
                {/* Graph objects */
                  GraphRenderer &&
                  <GraphRenderer currentModule={this._module} parent={this._workspace}/>}
                {/* Graph overlays */
                  GraphOverlayRenderer &&
                  <GraphOverlayRenderer currentModule={this._module} parent={this._workspace}/>}
              </WorkspaceView>

              <NotificationView notificationManager={Notifications}>
              </NotificationView>

              <HotKeyView hotKeyManager={this._hotKeyManager}/>

              <ViewportView ref={ref=>this._viewport=ref}>
                {<EditPane app={this} module={this._module} viewport={viewport}/>}
                {<TapePane app={this} module={this._module} viewport={viewport} tester={this._tester}/>}
              </ViewportView>

            </div>
          </UploadDropZone>
        </DrawerView>

      </div>
    );
  }
}

//For hotloading this class
export default hot(App);