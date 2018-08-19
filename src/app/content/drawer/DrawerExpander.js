import React from 'react';
import './DrawerExpander.css';

class DrawerExpander extends React.Component
{
  constructor(props)
  {
    super(props);
  }

  render()
  {
    const app = this.props.app;
    const open = app.state.isOpen;
    return <div className={"drawer-expand" + (open ? " open" : "")}
      onClick={open ? app.closeDrawer.bind(app) : app.openDrawer.bind(app)}>
      <svg
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg">
        <path d="M5 3.737l12.395 8.263-12.395 8.263v-16.526zm-2-3.737v24l18-12-18-12z"/>
      </svg>
    </div>;
  }
}

export default DrawerExpander;
