// #package glsl/mixins

// #section computeCPF

float shadingIntensity(vec3 pos ,ivec3 voxel)
{
    //Blinn-Phong model
    //float uCa=0.20;//ambient lighting coefficient
    //float uCd=0.20;//diffuse lighting coefficient
    //float uCs=0.60;//specular lighting coefficient
    //float uCe=50.0;//shininess 

    vec3 N = normalize(getGradient(voxel));
    vec3 E = normalize(uCameraPos-pos);
    vec3 L = normalize(uLightPos-pos);
    //float LDist = distance(uLightPos,pos);
   // LDist = LDist*LDist;
    //calculate Ambient Term: 
    float Ca = uCa;

    //calculate Diffuse Term:  
    float Cd = uCd * max(dot(N,L), 0.0);
    //if(LDist>0.0)
        //Cd = Cd*(1.0/(LDist));

    // calculate Specular Term:
    vec3 H = normalize(L+E);
    float Cs = uCs * pow((max(dot(N,H), 0.0)),uCe);
    //if(LDist>0.0)
        //Cs = Cs*(1.0/(LDist));

    return (Cd+Cs+Ca);
}

float computeGradientMagnitude(ivec3 voxel) {
    vec3 g = getGradient(voxel);
	return sqrt(g.x*g.x + g.y*g.y + g.z*g.z);
}
float normlizedGradientMagnitud(ivec3 voxel)
{
    float gm = computeGradientMagnitude(voxel);
	return  (gm-uMinGM)/(uMaxGM-uMinGM);
}
float normlizedDistance(vec3 pos)
{ 
    return  (distance(pos,uCameraPos)-uMinDist)/(uMaxDist-uMinDist);
}
float computeCPF(vec3 pos,ivec3 voxel)//,float accOpacity)
{
    // pos: current sample position
    // accOpacity: previously accumulated opacity value .. due to (1.0-accOpacity) structures located 
    // behind semitransparent regions will appear more opaque. 
    // ks & kt two parameters allow intuitive control of the visualization
    float SP= shadingIntensity(pos,voxel);
    if(uShadingTerm==0)
        SP=1.0;

    float DP= ( 1.0 - normlizedDistance(pos));
    if(uDistTerm==0)
        DP=1.0;
        
    //float exponent=pow((uKt*SP*DP*(1.0-accOpacity)),uKs);
    float exponent=pow(uKt*SP*DP,uKs);
    float GP= normlizedGradientMagnitud(voxel);
    float prob= pow(GP,exponent); 
    return prob;
}