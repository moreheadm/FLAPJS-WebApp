import React from 'react';
import './StatusButton.css';

import IconButton from 'icons/IconButton.js';
import SuccessIcon from 'icons/SuccessIcon.js';
import FailureIcon from 'icons/FailureIcon.js';
import WorkingIcon from 'icons/WorkingIcon.js';

class StatusButton extends React.Component
{
  constructor(props)
  {
    super(props);
  }

  render()
  {
    const active = this.props.active;
    if (this.props.mode > 0)
    {
      //Success icon
      return <IconButton className={"status-icon success" + (active ? " active" : "")}
        onClick={this.props.onClick}>
        <SuccessIcon/>
      </IconButton>;
    }
    else if (this.props.mode < 0)
    {
      //Failure icon
      return <IconButton className={"status-icon failure" + (active ? " active" : "")}
        onClick={this.props.onClick}>
        <FailureIcon/>
      </IconButton>;
    }
    else
    {
      //Pending icon
      return <IconButton className={"status-icon" + (active ? " active" : "")}
        onClick={this.props.onClick}>
        <WorkingIcon/>
      </IconButton>;
    }
  }
}

export default StatusButton;
