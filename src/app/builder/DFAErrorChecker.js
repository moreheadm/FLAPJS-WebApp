import Config from 'config.js';
import { EMPTY } from 'machine/Symbols.js';

import StateUnreachableWarningMessage from './error/StateUnreachableWarningMessage.js';
import TransitionErrorMessage from './error/TransitionErrorMessage.js';
import StateErrorMessage from './error/StateErrorMessage.js';
import SuccessMessage from 'notification/SuccessMessage.js';

class DFAErrorChecker
{
  constructor(machineBuilder, graph)
  {
    this.machineBuilder = machineBuilder;
    this.graph = graph;

    this.errorNodes = [];
    this.errorEdges = [];
    this.warningNodes = [];
    this.warningEdges = [];
  }

  clear()
  {
    this.errorNodes.length = 0;
    this.errorEdges.length = 0;
    this.warningNodes.length = 0;
    this.warningEdges.length = 0;
  }

  checkErrors(notification=null)
  {
    //This should only run for "DFA" machine types...
    if (this.machineBuilder.getMachineType() != "DFA")
    {
      throw new Error("Invalid machine type to check for DFA errors");
    }

    const machine = this.machineBuilder.getMachine();
    const graph = this.graph;
    const alphabet = machine.getAlphabet();
    const errorNodes = this.errorNodes;
    const errorEdges = this.errorEdges;
    const warnNodes = this.warningNodes;
    const warnEdges = this.warningEdges;
    this.clear();

    let nodeTransitionMap = new Map();
    let unReachedNode = graph.nodes.slice();
    let startNode = graph.getStartNode();
    unReachedNode.splice(unReachedNode.indexOf(startNode),1);

    const placeholderEdges = [];
    const emptyEdges = [];
    const dupeEdges = [];
    for(const edge of graph.edges)
    {
      //check incomplete edges
      if (edge.isPlaceholder())
      {
        //Update cached error targets
        placeholderEdges.push(edge);
        if (errorEdges.indexOf(edge) == -1) errorEdges.push(edge);
      }
      else
      {
        const from = edge.from;
        const to = edge.to;
        const labels = edge.label.split(",");

        for(const label of labels)
        {
          //remove to from unReachedNode list
          if(unReachedNode.includes(to)) unReachedNode.splice(unReachedNode.indexOf(to),1);

          //check for empty transitions
          if(label == EMPTY)
          {
            //Update cached error targets
            emptyEdges.push(edge);
            if (errorEdges.indexOf(edge) == -1) errorEdges.push(edge);
          }
          else
          {
            if(!nodeTransitionMap.has(from))
            {
              nodeTransitionMap.set(from, [label]);
            }
            else
            {
              //check for duplicate transitions
              const currentAlphabet = nodeTransitionMap.get(from);
              if(currentAlphabet.includes(label))
              {
                //Update cached error targets
                dupeEdges.push(edge);
                if (errorEdges.indexOf(edge) == -1) errorEdges.push(edge);
              }
              else
              {
                currentAlphabet.push(label);
              }
            }
          }
        }
      }
    }

    //check disconnect states
    for (const node of unReachedNode)
    {
      if (warnNodes.indexOf(node) == -1) warnNodes.push(node);
    }

    const missingNodes = [];
    //Check for missing transitions
    for(const node of graph.nodes)
    {
      const nodeTransitions = nodeTransitionMap.get(node);
      if (!nodeTransitions && alphabet.length != 0 ||
        nodeTransitions && nodeTransitions.length < alphabet.length)
      {
        //Update cached error targets
        missingNodes.push(node);
        if (errorNodes.indexOf(node) == -1) errorNodes.push(node);
      }
    }

    const result = !(errorNodes.length == 0 && errorEdges.length == 0 &&
      warnNodes.length == 0 && warnEdges.length == 0);

    //Callbacks for all collected errors
    if (notification)
    {
      const messageTag = Config.MACHINE_ERRORS_MESSAGE_TAG;
      //Clear the existing messages
      notification.clearMessage(messageTag);

      //No errors!
      if (!result)
      {
        notification.addMessage(I18N.toString("message.error.none"), messageTag, SuccessMessage, false);
      }
      //There are some errors/warnings...
      else
      {
        //Add new warning messages
        if (unReachedNode.length > 0) notification.addMessage(
          unReachedNode, messageTag, StateUnreachableWarningMessage, false);

        //Add new error messages
        if (placeholderEdges.length > 0) notification.addMessage(
          {text: I18N.toString("message.error.incomplete"), targets: placeholderEdges},
          messageTag, TransitionErrorMessage, false);
        if (emptyEdges.length > 0) notification.addMessage(
          {text: I18N.toString("message.error.empty"), targets: emptyEdges},
          messageTag, TransitionErrorMessage, false);
        if (dupeEdges.length > 0) notification.addMessage(
          {text: I18N.toString("message.error.dupe"), targets: dupeEdges},
          messageTag, TransitionErrorMessage, false);
        if (missingNodes.length > 0) notification.addMessage(
          {text: I18N.toString("message.error.missing"), targets: missingNodes},
          messageTag, StateErrorMessage, false);
      }
    }

    return result;
  }
}

export default DFAErrorChecker;
