import React from 'react';
import Style from './NavbarWidget.css';

import FullscreenWidget from 'experimental/widgets/FullscreenWidget.js';
import ZoomWidget from 'experimental/widgets/ZoomWidget.js';
import FocusCenterWidget from 'experimental/widgets/FocusCenterWidget.js';

class NavbarWidget extends React.Component
{
  constructor(props)
  {
    super(props);
  }

  //Override
  render()
  {
    const app = this.props.app;
    const viewport = app.getInputAdapter().getViewport();

    return (
      <div id={this.props.id}
        className={Style.navbar_container +
          " " + this.props.className}
        style={this.props.style}>
        <FullscreenWidget className={Style.navbar_widget} app={app}/>
        <ZoomWidget className={Style.navbar_widget_container} viewport={viewport}/>
        <FocusCenterWidget className={Style.navbar_widget} viewport={viewport}/>
      </div>
    );
  }
}

export default NavbarWidget;
