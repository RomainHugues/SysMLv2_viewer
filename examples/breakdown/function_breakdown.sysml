// Function Breakdown Structure (FBS) — a decomposition tree of functions.
//
// View as a Class diagram (right-click -> Celeris -> Show Class Diagram): the
// class diagram is the SysML Block Definition Diagram (BDD). Each function is an
// `action def`; a function is decomposed into sub-functions via typed `action`
// usages, which the BDD draws as composition (whole-part). The result is a
// top-down breakdown tree of the mission's functions.
package FunctionBreakdown {

    action def Mission {
        action surveil : Surveil;
        action engage : Engage;
        action report : Report;
    }

    action def Surveil {
        action detect : Detect;
        action track : Track;
        action identify : Identify;
    }

    action def Engage {
        action aim : Aim;
        action fire : Fire;
    }

    // leaf functions (not decomposed further)
    action def Report;
    action def Detect;
    action def Track;
    action def Identify;
    action def Aim;
    action def Fire;
}
