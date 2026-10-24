// Pre-built industry process templates for rapid project bootstrapping.

import { BlockType, BlockMode } from "@/types";
import type { ProcessTemplate } from "@/types";

export const PROCESS_TEMPLATES: ProcessTemplate[] = [
  {
    id: "p2p",
    nameKey: "templateP2p",
    descriptionKey: "templateP2pDesc",
    defaultUnit: "hours",
    tasks: [
      { id: "t_p2p_1", name: "Create Purchase Request", time: 0.5, resource: "Clerk" },
      { id: "t_p2p_2", name: "Approve Purchase Request", time: 1, resource: "Department Manager" },
      { id: "t_p2p_3", name: "Create Purchase Order", time: 0.5, resource: "Procurement Officer" },
      { id: "t_p2p_4", name: "Receive Goods", time: 1, resource: "Warehouse" },
      { id: "t_p2p_5", name: "Match Invoice", time: 1, resource: "Finance Officer" },
      { id: "t_p2p_6", name: "Process Payment", time: 0.5, resource: "Finance Officer" },
    ],
    blocks: [
      {
        id: "b_p2p_1",
        type: BlockType.SEQ,
        label: "Create Purchase Request",
        taskId: "t_p2p_1",
        time: 0.5,
        mode: BlockMode.SIMPLE,
      },
      {
        id: "b_p2p_2",
        type: BlockType.XOR,
        label: "Approved?",
        mode: BlockMode.SIMPLE,
        branches: [
          {
            id: "br_p2p_1",
            label: "Approved",
            p: 80,
            mode: BlockMode.COMPOSITE,
            subBlocks: [
              {
                id: "b_p2p_3",
                type: BlockType.SEQ,
                label: "Create Purchase Order",
                taskId: "t_p2p_3",
                time: 0.5,
                mode: BlockMode.SIMPLE,
              },
              {
                id: "b_p2p_4",
                type: BlockType.SEQ,
                label: "Receive Goods",
                taskId: "t_p2p_4",
                time: 1,
                mode: BlockMode.SIMPLE,
              },
              {
                id: "b_p2p_5",
                type: BlockType.AND,
                label: "Three-Way Match",
                mode: BlockMode.SIMPLE,
                branches: [
                  {
                    id: "br_p2p_2",
                    label: "Invoice Check",
                    mode: BlockMode.COMPOSITE,
                    subBlocks: [
                      {
                        id: "b_p2p_6",
                        type: BlockType.SEQ,
                        label: "Match Invoice",
                        taskId: "t_p2p_5",
                        time: 1,
                        mode: BlockMode.SIMPLE,
                      },
                    ],
                  },
                  {
                    id: "br_p2p_3",
                    label: "Payment Prep",
                    mode: BlockMode.COMPOSITE,
                    subBlocks: [
                      {
                        id: "b_p2p_7",
                        type: BlockType.SEQ,
                        label: "Process Payment",
                        taskId: "t_p2p_6",
                        time: 0.5,
                        mode: BlockMode.SIMPLE,
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            id: "br_p2p_4",
            label: "Rejected",
            p: 20,
            mode: BlockMode.SIMPLE,
            t: 0,
          },
        ],
      },
    ],
  },
  {
    id: "o2c",
    nameKey: "templateO2c",
    descriptionKey: "templateO2cDesc",
    defaultUnit: "hours",
    tasks: [
      { id: "t_o2c_1", name: "Create Order", time: 0.5, resource: "Sales" },
      { id: "t_o2c_2", name: "Check Stock", time: 0.5, resource: "System / Service" },
      { id: "t_o2c_3", name: "Pick and Pack", time: 2, resource: "Warehouse" },
      { id: "t_o2c_4", name: "Ship Order", time: 1, resource: "Logistics" },
      { id: "t_o2c_5", name: "Issue Invoice", time: 0.5, resource: "Finance Officer" },
      { id: "t_o2c_6", name: "Receive Payment", time: 0.5, resource: "Finance Officer" },
    ],
    blocks: [
      {
        id: "b_o2c_1",
        type: BlockType.SEQ,
        label: "Create Order",
        taskId: "t_o2c_1",
        time: 0.5,
        mode: BlockMode.SIMPLE,
      },
      {
        id: "b_o2c_2",
        type: BlockType.XOR,
        label: "Stock Available?",
        mode: BlockMode.SIMPLE,
        branches: [
          {
            id: "br_o2c_1",
            label: "In Stock",
            p: 75,
            mode: BlockMode.COMPOSITE,
            subBlocks: [
              {
                id: "b_o2c_3",
                type: BlockType.SEQ,
                label: "Pick and Pack",
                taskId: "t_o2c_3",
                time: 2,
                mode: BlockMode.SIMPLE,
              },
              {
                id: "b_o2c_4",
                type: BlockType.SEQ,
                label: "Ship Order",
                taskId: "t_o2c_4",
                time: 1,
                mode: BlockMode.SIMPLE,
              },
            ],
          },
          {
            id: "br_o2c_2",
            label: "Backorder",
            p: 25,
            mode: BlockMode.COMPOSITE,
            subBlocks: [
              {
                id: "b_o2c_5",
                type: BlockType.SEQ,
                label: "Await Restock",
                time: 24,
                mode: BlockMode.SIMPLE,
              },
            ],
          },
        ],
      },
      {
        id: "b_o2c_6",
        type: BlockType.SEQ,
        label: "Issue Invoice",
        taskId: "t_o2c_5",
        time: 0.5,
        mode: BlockMode.SIMPLE,
      },
      {
        id: "b_o2c_7",
        type: BlockType.SEQ,
        label: "Receive Payment",
        taskId: "t_o2c_6",
        time: 0.5,
        mode: BlockMode.SIMPLE,
      },
    ],
  },
  {
    id: "itsm",
    nameKey: "templateItsm",
    descriptionKey: "templateItsmDesc",
    defaultUnit: "hours",
    tasks: [
      { id: "t_itsm_1", name: "Report Incident", time: 0.5, resource: "End User" },
      { id: "t_itsm_2", name: "Categorize Ticket", time: 0.5, resource: "Service Desk" },
      { id: "t_itsm_3", name: "Resolve Incident", time: 2, resource: "IT Support" },
      { id: "t_itsm_4", name: "Close Ticket", time: 0.5, resource: "Service Desk" },
    ],
    blocks: [
      {
        id: "b_itsm_1",
        type: BlockType.SEQ,
        label: "Report Incident",
        taskId: "t_itsm_1",
        time: 0.5,
        mode: BlockMode.SIMPLE,
      },
      {
        id: "b_itsm_2",
        type: BlockType.SEQ,
        label: "Categorize Ticket",
        taskId: "t_itsm_2",
        time: 0.5,
        mode: BlockMode.SIMPLE,
      },
      {
        id: "b_itsm_3",
        type: BlockType.LOOP,
        label: "Resolve & Verify",
        loopP: 30,
        loopTime: 2,
        mode: BlockMode.SIMPLE,
        taskId: "t_itsm_3",
      },
      {
        id: "b_itsm_4",
        type: BlockType.SEQ,
        label: "Close Ticket",
        taskId: "t_itsm_4",
        time: 0.5,
        mode: BlockMode.SIMPLE,
      },
    ],
  },
];
