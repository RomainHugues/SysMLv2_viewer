// Interconnection (Internal Block Diagram) — BEHAVIOUR / data flow.
//
// View as an Interconnection diagram (right-click -> Celeris -> Show
// Interconnection Diagram): each `action` is a block, its `in` / `out` reference
// parameters sit on the block (▸ marks the direction), and an item `flow` between
// an output and an input is drawn as a directed (green) connector labelled with
// the item that flows.
package SignalChain {

    action def Acquire {
        out ref reading;
    }
    action def Filter {
        in ref raw;
        out ref clean;
    }
    action def Detect {
        in ref signal;
        out ref track;
    }
    action def Estimate {
        in ref track;
        out ref position;
    }

    action def SurveillanceThread {
        action acquire : Acquire;
        action filtering : Filter;
        action detect : Detect;
        action estimate : Estimate;

        flow from acquire.reading to filtering.raw;
        flow from filtering.clean to detect.signal;
        flow from detect.track to estimate.track;
    }
}
