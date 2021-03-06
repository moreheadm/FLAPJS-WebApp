import React from 'react';
import Style from 'experimental/viewport/ViewportView.css';

import TapeWidget from 'experimental/widgets/TapeWidget.js';
import NavbarWidget from 'experimental/widgets/NavbarWidget.js';

class TapePane extends React.Component
{
  constructor(props)
  {
    super(props);
  }

  //Override
  componentDidMount()
  {
    const currentModule = this.props.currentModule;
    const inputController = currentModule.getInputController();

    inputController.setDisabled(true);
  }

  //Override
  componentWillUnmount()
  {
    const currentModule = this.props.currentModule;
    const inputController = currentModule.getInputController();

    inputController.setDisabled(false);
  }

  //Override
  render()
  {
    const app = this.props.app;
    const currentModule = this.props.currentModule;
    const viewport = this.props.viewport;
    const tester = currentModule._tester;
    const inputController = currentModule.getInputController();
    const graphController = currentModule.getGraphController();
    const machineController = currentModule.getMachineController();

    return (
      <div id={this.props.id}
        className={Style.view_pane +
          " " + this.props.className}
        style={this.props.style}>
        <NavbarWidget className={Style.view_widget} style={{right: 0}}
          app={app}/>
        <div className={Style.view_widget} style={{bottom: 0}}>
          <TapeWidget value={tester ? tester.getTapeContext() : null}/>
        </div>
      </div>
    );
  }
}

export default TapePane;
