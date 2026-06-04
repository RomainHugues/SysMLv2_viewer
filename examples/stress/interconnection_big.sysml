package StressInterconnection {
    port def DP;
    interface def Link { end s : DP; end t : DP; }
    part def K0 { port qa : DP; port qb : DP; }
    part def K1 { port qa : DP; port qb : DP; }
    part def K2 { port qa : DP; port qb : DP; }
    part def K3 { port qa : DP; port qb : DP; }
    part def K4 { port qa : DP; port qb : DP; }
    part def K5 { port qa : DP; port qb : DP; }
    part def K6 { port qa : DP; port qb : DP; }
    part def K7 { port qa : DP; port qb : DP; }
    part def K8 { port qa : DP; port qb : DP; }
    part def K9 { port qa : DP; port qb : DP; }
    part def K10 { port qa : DP; port qb : DP; }
    part def K11 { port qa : DP; port qb : DP; }
    part def K12 { port qa : DP; port qb : DP; }
    part def K13 { port qa : DP; port qb : DP; }
    part def K14 { port qa : DP; port qb : DP; }
    part def K15 { port qa : DP; port qb : DP; }
    part def K16 { port qa : DP; port qb : DP; }
    part def K17 { port qa : DP; port qb : DP; }
    part def K18 { port qa : DP; port qb : DP; }
    part def K19 { port qa : DP; port qb : DP; }
    part def K20 { port qa : DP; port qb : DP; }
    part def K21 { port qa : DP; port qb : DP; }
    part def K22 { port qa : DP; port qb : DP; }
    part def K23 { port qa : DP; port qb : DP; }
    part def K24 { port qa : DP; port qb : DP; }
    part def K25 { port qa : DP; port qb : DP; }
    part def K26 { port qa : DP; port qb : DP; }
    part def K27 { port qa : DP; port qb : DP; }
    action def A0 { out ref outp; }
    action def A1 { in ref inp; out ref outp; }
    action def A2 { in ref inp; out ref outp; }
    action def A3 { in ref inp; out ref outp; }
    action def A4 { in ref inp; out ref outp; }
    action def A5 { in ref inp; out ref outp; }
    action def A6 { in ref inp; out ref outp; }
    action def A7 { in ref inp; out ref outp; }
    action def A8 { in ref inp; out ref outp; }
    action def A9 { in ref inp; out ref outp; }
    action def A10 { in ref inp; out ref outp; }
    action def A11 { in ref inp; out ref outp; }
    action def A12 { in ref inp; out ref outp; }
    action def A13 { in ref inp; out ref outp; }
    action def A14 { in ref inp; out ref outp; }
    action def A15 { in ref inp; out ref outp; }
    action def A16 { in ref inp; out ref outp; }
    action def A17 { in ref inp; out ref outp; }
    action def A18 { in ref inp; out ref outp; }
    action def A19 { in ref inp; out ref outp; }
    action def A20 { in ref inp; out ref outp; }
    action def A21 { in ref inp; out ref outp; }
    action def A22 { in ref inp; out ref outp; }
    action def A23 { in ref inp; out ref outp; }
    action def A24 { in ref inp; out ref outp; }
    action def A25 { in ref inp; out ref outp; }
    action def A26 { in ref inp; out ref outp; }
    action def A27 { in ref inp; out ref outp; }
    part def BigSystem {
        part k0 : K0;
        part k1 : K1;
        part k2 : K2;
        part k3 : K3;
        part k4 : K4;
        part k5 : K5;
        part k6 : K6;
        part k7 : K7;
        part k8 : K8;
        part k9 : K9;
        part k10 : K10;
        part k11 : K11;
        part k12 : K12;
        part k13 : K13;
        part k14 : K14;
        part k15 : K15;
        part k16 : K16;
        part k17 : K17;
        part k18 : K18;
        part k19 : K19;
        part k20 : K20;
        part k21 : K21;
        part k22 : K22;
        part k23 : K23;
        part k24 : K24;
        part k25 : K25;
        part k26 : K26;
        part k27 : K27;
        interface lk0 : Link connect k0.qb to k1.qa;
        connect k1.qb to k2.qa;
        connect k2.qb to k3.qa;
        connect k3.qb to k4.qa;
        connect k4.qb to k5.qa;
        connect k5.qb to k6.qa;
        connect k6.qb to k7.qa;
        interface lk7 : Link connect k7.qb to k8.qa;
        connect k8.qb to k9.qa;
        connect k9.qb to k10.qa;
        connect k10.qb to k11.qa;
        connect k11.qb to k12.qa;
        connect k12.qb to k13.qa;
        connect k13.qb to k14.qa;
        interface lk14 : Link connect k14.qb to k15.qa;
        connect k15.qb to k16.qa;
        connect k16.qb to k17.qa;
        connect k17.qb to k18.qa;
        connect k18.qb to k19.qa;
        connect k19.qb to k20.qa;
        connect k20.qb to k21.qa;
        interface lk21 : Link connect k21.qb to k22.qa;
        connect k22.qb to k23.qa;
        connect k23.qb to k24.qa;
        connect k24.qb to k25.qa;
        connect k25.qb to k26.qa;
        connect k26.qb to k27.qa;
    }
    action def BigThread {
        action ac0 : A0;
        action ac1 : A1;
        action ac2 : A2;
        action ac3 : A3;
        action ac4 : A4;
        action ac5 : A5;
        action ac6 : A6;
        action ac7 : A7;
        action ac8 : A8;
        action ac9 : A9;
        action ac10 : A10;
        action ac11 : A11;
        action ac12 : A12;
        action ac13 : A13;
        action ac14 : A14;
        action ac15 : A15;
        action ac16 : A16;
        action ac17 : A17;
        action ac18 : A18;
        action ac19 : A19;
        action ac20 : A20;
        action ac21 : A21;
        action ac22 : A22;
        action ac23 : A23;
        action ac24 : A24;
        action ac25 : A25;
        action ac26 : A26;
        action ac27 : A27;
        flow from ac0.outp to ac1.inp;
        flow from ac1.outp to ac2.inp;
        flow from ac2.outp to ac3.inp;
        flow from ac3.outp to ac4.inp;
        flow from ac4.outp to ac5.inp;
        flow from ac5.outp to ac6.inp;
        flow from ac6.outp to ac7.inp;
        flow from ac7.outp to ac8.inp;
        flow from ac8.outp to ac9.inp;
        flow from ac9.outp to ac10.inp;
        flow from ac10.outp to ac11.inp;
        flow from ac11.outp to ac12.inp;
        flow from ac12.outp to ac13.inp;
        flow from ac13.outp to ac14.inp;
        flow from ac14.outp to ac15.inp;
        flow from ac15.outp to ac16.inp;
        flow from ac16.outp to ac17.inp;
        flow from ac17.outp to ac18.inp;
        flow from ac18.outp to ac19.inp;
        flow from ac19.outp to ac20.inp;
        flow from ac20.outp to ac21.inp;
        flow from ac21.outp to ac22.inp;
        flow from ac22.outp to ac23.inp;
        flow from ac23.outp to ac24.inp;
        flow from ac24.outp to ac25.inp;
        flow from ac25.outp to ac26.inp;
        flow from ac26.outp to ac27.inp;
    }
}
