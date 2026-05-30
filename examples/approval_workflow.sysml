// Flowchart example: decision with guards and a merge node.
package ApprovalWorkflow {

    private import ScalarValues::*;

    action def ReviewRequest {
        attribute approved : Boolean;

        action submit;
        decide check;
        action autoApprove;
        action managerApprove;
        merge complete;
        action notify;

        succession first submit then check;
        first check if approved then autoApprove;
        first check if not approved then managerApprove;
        succession first autoApprove then complete;
        succession first managerApprove then complete;
        succession first complete then notify;
    }
}
