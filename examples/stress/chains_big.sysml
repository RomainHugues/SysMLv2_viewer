package StressChains {
    action MissionThread {
        action f0;
        action f1;
        action f2;
        action f3;
        action f4;
        action f5;
        action f6;
        action f7;
        action f8;
        action f9;
        action f10;
        action f11;
        action f12;
        action f13;
        action f14;
        action f15;
        action f16;
        action f17;
        action f18;
        action f19;
        action f20;
        action f21;
        action f22;
        action f23;
        action f24;
        action f25;
        action f26;
        action f27;
        action f28;
        action f29;
        action f30;
        action f31;
        action f32;
        action f33;
        action f34;
        action f35;
        action f36;
        action f37;
        action f38;
        action f39;
        action f40;
        action f41;
        action f42;
        action f43;
        action f44;
        action f45;
        action f46;
        action f47;
        succession first f0 then f1;
        succession first f1 then f2;
        succession first f2 then f3;
        succession first f3 then f4;
        succession first f4 then f5;
        succession first f5 then f6;
        succession first f6 then f7;
        succession first f7 then f8;
        succession first f8 then f9;
        succession first f9 then f10;
        succession first f10 then f11;
        succession first f11 then f12;
        succession first f12 then f13;
        succession first f13 then f14;
        succession first f14 then f15;
        succession first f15 then f16;
        succession first f16 then f17;
        succession first f17 then f18;
        succession first f18 then f19;
        succession first f19 then f20;
        succession first f20 then f21;
        succession first f21 then f22;
        succession first f22 then f23;
        succession first f23 then f24;
        succession first f24 then f25;
        succession first f25 then f26;
        succession first f26 then f27;
        succession first f27 then f28;
        succession first f28 then f29;
        succession first f29 then f30;
        succession first f30 then f31;
        succession first f31 then f32;
        succession first f32 then f33;
        succession first f33 then f34;
        succession first f34 then f35;
        succession first f35 then f36;
        succession first f36 then f37;
        succession first f37 then f38;
        succession first f38 then f39;
        succession first f39 then f40;
        succession first f40 then f41;
        succession first f41 then f42;
        succession first f42 then f43;
        succession first f43 then f44;
        succession first f44 then f45;
        succession first f45 then f46;
        succession first f46 then f47;
    }
    use case def Chain0 {
        perform MissionThread.f0;
        perform MissionThread.f1;
        perform MissionThread.f2;
        perform MissionThread.f3;
        perform MissionThread.f4;
        perform MissionThread.f5;
        perform MissionThread.f6;
        perform MissionThread.f7;
        perform MissionThread.f8;
        perform MissionThread.f9;
        perform MissionThread.f10;
        perform MissionThread.f11;
    }
    use case def Chain1 {
        perform MissionThread.f7;
        perform MissionThread.f8;
        perform MissionThread.f9;
        perform MissionThread.f10;
        perform MissionThread.f11;
        perform MissionThread.f12;
        perform MissionThread.f13;
        perform MissionThread.f14;
        perform MissionThread.f15;
        perform MissionThread.f16;
        perform MissionThread.f17;
        perform MissionThread.f18;
    }
    use case def Chain2 {
        perform MissionThread.f14;
        perform MissionThread.f15;
        perform MissionThread.f16;
        perform MissionThread.f17;
        perform MissionThread.f18;
        perform MissionThread.f19;
        perform MissionThread.f20;
        perform MissionThread.f21;
        perform MissionThread.f22;
        perform MissionThread.f23;
        perform MissionThread.f24;
        perform MissionThread.f25;
    }
    use case def Chain3 {
        perform MissionThread.f21;
        perform MissionThread.f22;
        perform MissionThread.f23;
        perform MissionThread.f24;
        perform MissionThread.f25;
        perform MissionThread.f26;
        perform MissionThread.f27;
        perform MissionThread.f28;
        perform MissionThread.f29;
        perform MissionThread.f30;
        perform MissionThread.f31;
        perform MissionThread.f32;
    }
    use case def Chain4 {
        perform MissionThread.f28;
        perform MissionThread.f29;
        perform MissionThread.f30;
        perform MissionThread.f31;
        perform MissionThread.f32;
        perform MissionThread.f33;
        perform MissionThread.f34;
        perform MissionThread.f35;
        perform MissionThread.f36;
        perform MissionThread.f37;
        perform MissionThread.f38;
        perform MissionThread.f39;
    }
    use case def Chain5 {
        perform MissionThread.f36;
        perform MissionThread.f37;
        perform MissionThread.f38;
        perform MissionThread.f39;
        perform MissionThread.f40;
        perform MissionThread.f41;
        perform MissionThread.f42;
        perform MissionThread.f43;
        perform MissionThread.f44;
        perform MissionThread.f45;
        perform MissionThread.f46;
        perform MissionThread.f47;
    }
    part def Comp0;
    part comp0 : Comp0 { perform MissionThread.f0; }
    part def Comp1;
    part comp1 : Comp1 { perform MissionThread.f1; }
    part def Comp2;
    part comp2 : Comp2 { perform MissionThread.f2; }
    part def Comp3;
    part comp3 : Comp3 { perform MissionThread.f3; }
    part def Comp4;
    part comp4 : Comp4 { perform MissionThread.f4; }
    part def Comp5;
    part comp5 : Comp5 { perform MissionThread.f5; }
    part def Comp6;
    part comp6 : Comp6 { perform MissionThread.f6; }
    part def Comp7;
    part comp7 : Comp7 { perform MissionThread.f7; }
    part def Comp8;
    part comp8 : Comp8 { perform MissionThread.f8; }
    part def Comp9;
    part comp9 : Comp9 { perform MissionThread.f9; }
    part def Comp10;
    part comp10 : Comp10 { perform MissionThread.f10; }
    part def Comp11;
    part comp11 : Comp11 { perform MissionThread.f11; }
    part def Comp12;
    part comp12 : Comp12 { perform MissionThread.f12; }
    part def Comp13;
    part comp13 : Comp13 { perform MissionThread.f13; }
    part def Comp14;
    part comp14 : Comp14 { perform MissionThread.f14; }
    part def Comp15;
    part comp15 : Comp15 { perform MissionThread.f15; }
    part def Comp16;
    part comp16 : Comp16 { perform MissionThread.f16; }
    part def Comp17;
    part comp17 : Comp17 { perform MissionThread.f17; }
    part def Comp18;
    part comp18 : Comp18 { perform MissionThread.f18; }
    part def Comp19;
    part comp19 : Comp19 { perform MissionThread.f19; }
    part def Comp20;
    part comp20 : Comp20 { perform MissionThread.f20; }
    part def Comp21;
    part comp21 : Comp21 { perform MissionThread.f21; }
    part def Comp22;
    part comp22 : Comp22 { perform MissionThread.f22; }
    part def Comp23;
    part comp23 : Comp23 { perform MissionThread.f23; }
}
