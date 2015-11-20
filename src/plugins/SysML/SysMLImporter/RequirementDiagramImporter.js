/**
 * Created by Dana Zhang on 11/18/15.
 */

/*globals define*/
/*jshint node:true, browser:true*/

/**
 * Author: Dana Zhang
 * Created on: October 31, 2015
 */

define(['./SysMLImporterConstants'], function (CONSTANTS) {

    'use strict';

    var RequirementDiagramImporter = function () {

    };

    RequirementDiagramImporter.prototype.buildDiagram = function (sysmlData, modelNotation) {
        var self = this,
            PREFIX ='@http://www.omg.org/spec/XMI/20131001:',
            i,
            idToNode = {},
            connectionIdToType = self._getConnectionIdTypes(sysmlData),
            node,
            linkNode,
            nodeId,
            nodeType,
            links = [],
            smNode;

        sysmlData = sysmlData['http://www.eclipse.org/uml2/5.0.0/UML:Model'];
        // Create the requirement diagram
        smNode = self._constructNode(self.activeNode, self.META.RequirementDiagram, sysmlData['@name'], {x: 200, y: 200});

        // get all Requirement nodes
        if (!sysmlData.packagedElement.length) {
            nodeId = sysmlData.packagedElement[PREFIX + 'id'];
            nodeType = CONSTANTS.SYSML_TO_META_TYPES[sysmlData.packagedElement[PREFIX + 'type'].replace('uml:', '')];
            if (!idToNode[nodeId]) {
                node = self._constructNode(smNode, self.META[nodeType], sysmlData.packagedElement['@name'],
                    {x: 100, y: 200});   // This could be more fancy.

                if (nodeType === 'Requirement' && sysmlData.packagedElement.nestedClassifier) {
                    self._constructReqtNodeRec(sysmlData.packagedElement, smNode, 1, idToNode, links);
                }
                idToNode[nodeId] = node;
            }
        }

        for (i = 0; i < sysmlData.packagedElement.length; i += 1) {
            nodeId = sysmlData.packagedElement[i][PREFIX + 'id'];
            nodeType = CONSTANTS.SYSML_TO_META_TYPES[sysmlData.packagedElement[i][PREFIX + 'type'].replace('uml:', '')];


            // get requirement connections
            if (nodeType === 'Abstraction') {

                links.push({
                    src: sysmlData.packagedElement[i]['@client'],
                    dst: sysmlData.packagedElement[i]['@supplier'],
                    type: connectionIdToType[sysmlData.packagedElement[i][PREFIX + 'id']]
                });

            } else if (!idToNode[nodeId]) {
                node = self._constructNode(smNode, self.META[nodeType], sysmlData.packagedElement[i]['@name'],
                    {x: 50 + (100 * i), y: 200});   // This could be more fancy.

                if (nodeType === 'Requirement' && sysmlData.packagedElement[i].nestedClassifier) {
                    self._constructReqtNodeRec(sysmlData.packagedElement[i], smNode, i, idToNode, links);
                }

                // Add the node with its old id to the map (will be used when creating the connections)
                idToNode[nodeId] = node;
            }
        }



        // With all links created, we will now create the connections between the nodes.
        for (i = 0; i < links.length; i += 1) {
            linkNode = self.core.createNode({
                parent: smNode,
                base: self.META[links[i].type]
            });

            self.core.setPointer(linkNode, 'src', idToNode[links[i].src]);
            self.core.setPointer(linkNode, 'dst', idToNode[links[i].dst]);
        }

    };

    RequirementDiagramImporter.prototype._constructNode = function (parentNode, metaType, name, position) {
        var self = this,
            smNode;

        smNode = self.core.createNode({
            parent: parentNode,
            base: metaType
        });
        self.core.setAttribute(smNode, 'name', name);
        self.core.setRegistry(smNode, 'position', position);

        return smNode;
    };

    RequirementDiagramImporter.prototype._constructReqtNodeRec = function (rqmtElm, node, inc, idToNode, links) {
        var self = this,
            PREFIX ='@http://www.omg.org/spec/XMI/20131001:',
            nestedElms = rqmtElm['nestedClassifier'],
            i,
            _construct;

        _construct = function (elm) {
            idToNode[elm[PREFIX + 'id']] = self._constructNode(node, self.META.Requirement, elm['@name'],
                {x: 50 + (100 * inc), y: 300});

            links.push({
                src: rqmtElm[PREFIX + 'id'],
                dst: elm[PREFIX + 'id'],
                type: 'Decompose'
            });
            if (elm.nestedClassifier) {
                self._constructReqtNodeRec(elm, node, inc + 1, idToNode, links);
            }
        };

        if (nestedElms.length) {
            for (i = 0; i < nestedElms.length; ++i) {
                _construct(nestedElms[i]);
            }
        } else {
            _construct(nestedElms);
        }
    };

    RequirementDiagramImporter.prototype._getConnectionIdTypes = function (connElms) {
        var CONN_PREFIX = 'http://www.eclipse.org/papyrus/0.7.0/SysML/Requirements:',
            connection,
            i,
            connectionIdToType = {};

        for (connection in connElms) {
            if (connElms.hasOwnProperty(connection)) {
                if (connection.indexOf(CONN_PREFIX) > -1 && connection !== CONN_PREFIX + 'Requirement' ) {
                    if (connElms[connection].length) {
                        for (i = 0; i < connElms[connection].length; ++i) {
                            connectionIdToType[connElms[connection][i]['@base_Abstraction']] = connection.replace(CONN_PREFIX, '');
                        }

                    } else {
                        connectionIdToType[connElms[connection]['@base_Abstraction']] = connection.replace(CONN_PREFIX, '');
                    }
                }
            }
        }

        return connectionIdToType;
    };


    return RequirementDiagramImporter;
});