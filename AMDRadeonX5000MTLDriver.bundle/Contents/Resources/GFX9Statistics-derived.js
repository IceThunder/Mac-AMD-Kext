// Counters are being captured in multiple rounds. For small draw call, data can vary pretty significantly. So we need to cap the rate.

function GPUTime()
{
    return MTLStat_nSec;
}

function GPUBusy()
{
    if (AMDStat_GPU_Engine_Busy_Ticks < AMDStat_GPU_Engine_Ticks)
        return (AMDStat_GPU_Engine_Busy_Ticks/AMDStat_GPU_Engine_Ticks * 100);
    else
        return 100;
}

function GPUStall()
{
    return 100 - GPUBusy();
}

function ShaderCoreUtilization()
{
    if (MTLStatComputeCost != 0)
        return MTLStatComputeCost;
    else
        return MTLStatShaderCost;
}

function ShaderCoreALUActive()
{
    var rate = 0;
    if (MTLStatComputeCost != 0)
        rate = (((AMDStat_Compute_SALU_Inst_Cycles + AMDStat_Compute_VALU_Thread_Cycles) / NumSE) / AMDStat_GPU_Engine_Busy_Ticks) / (NumCUPerSH * NumSH) * 100;
    else
        rate = (((AMDStat_Shader_SALU_Cycles + AMDStat_Shader_VALU_Cycles) / NumSE) / AMDStat_GPU_Engine_Busy_Ticks) / (NumCUPerSH * NumSH) * 100;

    return (rate > 100 ? 100 : rate);
}

function ShaderCoreStall()
{
    var OtherActive = (((AMDStat_Shader_SMEM_Cycles + AMDStat_Shader_VMEM_Read_Cycles + AMDStat_Shader_VMEM_Write_Cycles + AMDStat_Shader_EXP_Cycles + AMDStat_Shader_GDS_Cycles) / NumSE) / AMDStat_GPU_Engine_Busy_Ticks) / (NumCUPerSH * NumSH) * 100;
    var AllActive = ShaderCoreALUActive() + OtherActive;
    if (AllActive >= MTLStatShaderCost)
        return 0;
    else
        return MTLStatShaderCost - AllActive;
}

function ShaderCoreVertexALUActive()
{
    var rate = (((AMDStat_Vertex_SALU_Inst_Cycles + AMDStat_Vertex_VALU_Thread_Cycles) / NumSE) / AMDStat_GPU_Engine_Busy_Ticks) / (NumCUPerSH * NumSH) * 100;
    return (rate > 100 ? 100 : rate);
}

function ShaderCoreFragmentALUActive()
{
    var rate = (((AMDStat_Fragment_SALU_Inst_Cycles + AMDStat_Fragment_VALU_Thread_Cycles) / NumSE) / AMDStat_GPU_Engine_Busy_Ticks) / (NumCUPerSH * NumSH) * 100;
    return (rate > 100 ? 100 : rate);
}

function ShaderCoreVertexStall()
{
    // Percentage of GPU time that shader core is doing real work for vertex shader.
    var Active = (((AMDStat_Vertex_VALU_Thread_Cycles + AMDStat_Vertex_SALU_Inst_Cycles + AMDStat_Vertex_VMEM_Read_Cycles + AMDStat_Vertex_VMEM_Write_Cycles + AMDStat_Vertex_SMEM_Inst_Cycles + AMDStat_Vertex_EXP_Inst_Cycles) / NumSE) / AMDStat_GPU_Engine_Busy_Ticks) / (NumCUPerSH * NumSH) * 100;
    // (VertexShaderBusyPercentage - Active) is the percentage of GPU time that shader core is being stalled for vertex shader workload.
    if (Active >= MTLStatVertexCost)
        return 0;
    else
        return MTLStatVertexCost - Active;
}

function ShaderCoreFragmentStall()
{
    var Active = (((AMDStat_Fragment_VALU_Thread_Cycles + AMDStat_Fragment_SALU_Inst_Cycles + AMDStat_Fragment_VMEM_Read_Cycles + AMDStat_Fragment_VMEM_Write_Cycles+ AMDStat_Fragment_SMEM_Inst_Cycles + AMDStat_Fragment_EXP_Inst_Cycles) / NumSE) / AMDStat_GPU_Engine_Busy_Ticks) / (NumCUPerSH * NumSH) * 100;
    if (Active >= MTLStatFragmentCost)
        return 0;
    else
        return MTLStatFragmentCost - Active;
}

function MemoryStallPerWavefrontCompute()
{
    var MemWait = (AMDStat_Compute_WAIT_CNT_VM > AMDStat_Compute_Wait_Inst_VMEM) ? AMDStat_Compute_WAIT_CNT_VM : AMDStat_Compute_Wait_Inst_VMEM;
    var rate = (MemWait / AMDStat_Compute_Waves_Executed) / AverageWavefrontLatencyCompute() * 100;
    return (rate >= 99) ? 99 : rate;
}

function MemoryStallPerWavefrontVertex()
{
    var MemWait = (AMDStat_Vertex_WAIT_CNT_VM > AMDStat_Vertex_Wait_Inst_VMEM) ? AMDStat_Vertex_WAIT_CNT_VM : AMDStat_Vertex_Wait_Inst_VMEM;
    var rate = (MemWait / AMDStat_Vertex_Waves_Executed) / AverageWavefrontLatencyVertex() * 100;
    return (rate >= 99) ? 99 : rate;
}

function MemoryStallPerWavefrontFragment()
{
    var MemWait = (AMDStat_Fragment_WAIT_CNT_VM > AMDStat_Fragment_Wait_Inst_VMEM) ? AMDStat_Fragment_WAIT_CNT_VM : AMDStat_Fragment_Wait_Inst_VMEM;
    var rate = (MemWait / AMDStat_Fragment_Waves_Executed) / AverageWavefrontLatencyFragment() * 100;
    return (rate >= 99) ? 99 : rate;
}

function LdsStallPerWavefrontCompute()
{
    var LdsWait = (AMDStat_Compute_WAIT_CNT_LGKM > AMDStat_Compute_LDS_Wait) ? AMDStat_Compute_WAIT_CNT_LGKM : AMDStat_Compute_LDS_Wait;
    var rate = (LdsWait / AMDStat_Compute_Waves_Executed) / AverageWavefrontLatencyCompute() * 100;
    return (rate >= 99) ? 99 : rate;
}

function LdsStallPerWavefrontVertex()
{
    var LdsWait = (AMDStat_Vertex_WAIT_CNT_LGKM > AMDStat_Vertex_LDS_Wait) ? AMDStat_Vertex_WAIT_CNT_LGKM : AMDStat_Vertex_LDS_Wait;
    var rate = (LdsWait / AMDStat_Vertex_Waves_Executed) / AverageWavefrontLatencyVertex() * 100;
    return (rate >= 99) ? 99 : rate;
}

function LdsStallPerWavefrontFragment()
{
    var LdsWait = (AMDStat_Fragment_WAIT_CNT_LGKM > AMDStat_Fragment_LDS_Wait) ? AMDStat_Fragment_WAIT_CNT_LGKM : AMDStat_Fragment_LDS_Wait;
    var rate = (LdsWait / AMDStat_Fragment_Waves_Executed) / AverageWavefrontLatencyFragment() * 100;
    return (rate >= 99) ? 99 : rate;
}

function ExportStallPerWavefrontVertex()
{
    var rate = ((AMDStat_Vertex_WAIT_CNT_EXP + AMDStat_Vertex_Wait_Export_Alloc) / AMDStat_Vertex_Waves_Executed) / AverageWavefrontLatencyVertex() * 100;
    return (rate >= 99) ? 99 : rate;
}

function ExportStallPerWavefrontFragment()
{
    var rate = ((AMDStat_Fragment_Wait_Export_Alloc + AMDStat_Fragment_WAIT_CNT_EXP) / AMDStat_Fragment_Waves_Executed) / AverageWavefrontLatencyFragment() * 100;
    return (rate >= 99) ? 99 : rate;
}

function AverageWavefrontLatencyCompute()
{
    return (AMDStat_Compute_Accum_Prev_Cycles) / AMDStat_Compute_Waves_Executed;
}

function AverageWavefrontLatencyVertex()
{
    return (AMDStat_Vertex_Accum_Prev_Cycles) / AMDStat_Vertex_Waves_Executed;
}

function AverageWavefrontLatencyFragment()
{
    return (AMDStat_Fragment_Accum_Prev_Cycles) / AMDStat_Fragment_Waves_Executed;
}

function AverageWavesInflightCompute()
{
    return (AMDStat_Compute_Accum_Prev_Cycles) / (NumCUPerSH * NumSH) / AMDStat_Compute_Busy_Cycles;
}

function AverageWavesInflightVertex()
{
    return (AMDStat_Vertex_Accum_Prev_Cycles) / (NumCUPerSH * NumSH) / AMDStat_Vertex_Busy_Cycles;
}

function AverageWavesInflightFragment()
{
    return (AMDStat_Fragment_Accum_Prev_Cycles) / (NumCUPerSH * NumSH) / AMDStat_Fragment_Busy_Cycles;
}

function SamplerBusy()
{
    return AMDStat_Sampler_Busy;
}

function L2CacheThroughput()
{
    return (AMDStat_L2_Cache_Request / (AMDStat_L2_Busy / 100 * AMDStat_GPU_Engine_Busy_Ticks));
}

function L2CacheDramBandwidth()
{
    return ((AMDStat_Tex_Write_Size + AMDStat_Tex_Fetch_Size) / (AMDStat_L2_Busy / 100 * AMDStat_GPU_Engine_Busy_Ticks)) * SysClkFreq / 100000;
}

function VSInvocation()
{
    if (AMDStat_DS_Invocations == 0)
        return AMDStat_VS_Invocations;
    else
        return AMDStat_DS_Invocations;
}

function CSInvocation()
{
    return AMDStat_CS_Invocations;
}

function PSInvocation()
{
    return AMDStat_PS_Invocations;
}

function VertexCost()
{
    return AMDStat_Vertex_Accum_Prev_Cycles / (AMDStat_Vertex_Accum_Prev_Cycles + AMDStat_Fragment_Accum_Prev_Cycles) * 100;
}

function VertexDuration()
{
    return MTLStatVertexCost / (MTLStatVertexCost + MTLStatFragmentCost) * 100;
}

function FragmentCost()
{
    return AMDStat_Fragment_Accum_Prev_Cycles / (AMDStat_Vertex_Accum_Prev_Cycles + AMDStat_Fragment_Accum_Prev_Cycles) * 100;
}

function FragmentDuration()
{
    return MTLStatFragmentCost / (MTLStatVertexCost + MTLStatFragmentCost) * 100;
}

function PixelToVertexRatio()
{
    return (PixelsRasterized() / AMDStat_IA_Vertices);
}

function PixelPerTriangle()
{
    return (PixelsRasterized() / PrimitivesSubmitted());
}

function VerticesSubmitted()
{
    if (AMDStat_HS_Invocations == 0)
        return AMDStat_IA_Vertices;
    else
        return AMDStat_VS_Vertices_In;
}

function NumberOfPatchesSubmitted()
{
    if (AMDStat_HS_Invocations > 0)
        return AMDStat_IA_Vertices;
    else
        return 0;
}

function VerticesReused()
{
    if (AMDStat_Vertices_Reuse != 0)
    {
        return (AMDStat_IA_Vertices - AMDStat_VS_Invocations);
    }
    else
        return 0;
}

function VerticesReusedPercentage()
{
    return (VerticesReused() * 100 / AMDStat_IA_Vertices);
}

function VerticesRendered()
{
    return AMDStat_VS_Vertices_In;
}

function VerticesRenderedPercentage()
{
    return (AMDStat_VS_Vertices_In * 100 / VerticesSubmitted());
}

function AverageTessFactor()
{
    if (AMDStat_HS_Invocations > 0)
        return (AMDStat_VS_Vertices_In / AMDStat_IA_Vertices);
    else
        return 0;
}

function PrimitivesSubmitted()
{
    if (AMDStat_HS_Invocations > 0)
        return AMDStat_C_Invocations;
    else
        return AMDStat_IA_Primitives;
}

function PrimitivesRendered()
{
    return AMDStat_C_Primitives;
}

function PrimitivesRenderedPercentage()
{
    return (AMDStat_C_Primitives * 100 / PrimitivesSubmitted());
}

function NumberOfCulledPrimitives()
{
    return AMDStat_Culled_Prims;
}

function NumberOfCulledPrimitivesPercentage()
{
    return (AMDStat_Culled_Prims * 100 / PrimitivesSubmitted());
}

function NumberOfClippedPrimitives()
{
    return AMDStat_Clipped_Prims;
}

function NumberOfClippedPrimitivesPercentage()
{
    return (AMDStat_Clipped_Prims * 100 / PrimitivesSubmitted());
}

function HierarchicalZTotalTilesCount()
{
    return AMDStat_HiZTiles_Total_Count;
}

function HierarchicalZFailPercentage()
{
    return (AMDStat_HiZTiles_Culled_Count * 100 / AMDStat_HiZTiles_Total_Count);
}

function PreZPassSampleCount()
{
    return AMDStat_PreZ_Samples_PassingZ;
}

function PreZFailSampleCount()
{
    return AMDStat_PreZ_Samples_FailingZ;
}

function PreZStencilFailSampleCount()
{
    return AMDStat_PreZ_Samples_FailingS;
}

function PostZPassSampleCount()
{
    return AMDStat_PostZ_Samples_PassingZ;
}

function PostZFailSampleCount()
{
    return AMDStat_PostZ_Samples_FailingZ;
}

function PostZStencilFailSampleCount()
{
    return AMDStat_PostZ_Samples_FailingS;
}

function PixelsRasterized()
{
    return AMDStat_PreHiZ_Total_Quads_Count * 4;
}

function PreZFailPercentage()
{
    if (AMDStat_FS_Quads_Count != 0)
    {
        return (AMDStat_PreZ_Quads_Count - AMDStat_FS_Quads_Count) / AMDStat_PreHiZ_Total_Quads_Count * 100;
    }
    else
    {
        // This is Z only rendering
        return 0;
    }
}

function PostZFailPercentage()
{
    var PostZFailRate = (AMDStat_PostZ_Samples_FailingZ + AMDStat_PostZ_Samples_FailingS) / (AMDStat_PostZ_Samples_FailingZ + AMDStat_PostZ_Samples_FailingS + AMDStat_PostZ_Samples_PassingZ);
    if (AMDStat_PostFS_Pixels == 0)
    {
        // This is Z only rendering
        return  (AMDStat_PreZ_Quads_Count * PostZFailRate) / AMDStat_PreHiZ_Total_Quads_Count * 100;
    }
    else
    {
        return (AMDStat_PostFS_Pixels * PostZFailRate) / (AMDStat_PreHiZ_Total_Quads_Count * 4) * 100;
    }
}

function PixelsDrawn()
{
    return AMDStat_Pixels_Drawn / NumMRT();
}

function PixelsDrawnPercentage()
{
    return AMDStat_Quads_Drawn / NumMRT() / AMDStat_PreHiZ_Total_Quads_Count * 100;
}

function FragmentsDrawn()
{
    if (AMDStat_Quads_Drawn == AMDStat_Quad_Fragments_Drawn)
    {
        // No MSAA
        return PixelsDrawn();
    }
    else
    {
        return (AMDStat_Quad_Fragments_Drawn / NumMRT()) *4;
    }
}

function PixelsDiscardedPercentage()
{
    // Cannot use quad * 4 to get approximation about pixels discarded as discard is usually used when some but not all pixels in a quad need to be discarded.
    return (AMDStat_PS_Invocations - AMDStat_PostFS_Pixels) / (AMDStat_PreHiZ_Total_Quads_Count * 4) * 100;
}

function PixelRate()
{
    return (AMDStat_Pixels_Drawn / (AMDStat_CB_Busy / 100 * AMDStat_GPU_Engine_Busy_Ticks));
}

function ALUInstructionPerInvocationCompute()
{
    return ((AMDStat_Compute_SALU_Insts + AMDStat_Compute_VALU_Insts) / AMDStat_Compute_Waves_Executed);
}

function ALUInstructionPerInvocationVertex()
{
    return ((AMDStat_Vertex_SALU_Insts + AMDStat_Vertex_VALU_Insts) / AMDStat_Vertex_Waves_Executed);
}

function ALUInstructionPerInvocationFragment()
{
    return ((AMDStat_Fragment_SALU_Insts + AMDStat_Fragment_VALU_Insts) / AMDStat_Fragment_Waves_Executed);
}

function MemInstructionPerInvocationCompute()
{
    return ((AMDStat_Compute_VMEM_WR_Insts + AMDStat_Compute_VMEM_RD_Insts + AMDStat_Compute_SMEM_Insts) / AMDStat_Compute_Waves_Executed);
}

function MemInstructionPerInvocationVertex()
{
    return ((AMDStat_Vertex_VMEM_WR_Insts + AMDStat_Vertex_VMEM_RD_Insts + AMDStat_Vertex_SMEM_Insts) / AMDStat_Vertex_Waves_Executed);
}

function MemInstructionPerInvocationFragment()
{
    return ((AMDStat_Fragment_VMEM_WR_Insts + AMDStat_Fragment_VMEM_RD_Insts + AMDStat_Fragment_SMEM_Insts) / AMDStat_Fragment_Waves_Executed);
}

function ControlInstructionPerInvocationCompute()
{
    return (AMDStat_Compute_Branch_Insts / AMDStat_Compute_Waves_Executed);
}

function ControlInstructionPerInvocationVertex()
{
    return (AMDStat_Vertex_Branch_Insts / AMDStat_Vertex_Waves_Executed);
}

function ControlInstructionPerInvocationFragment()
{
    return (AMDStat_Fragment_Branch_Insts / AMDStat_Fragment_Waves_Executed);
}

function ALUToMemRatioCompute()
{
    return (ALUInstructionPerInvocationCompute() / MemInstructionPerInvocationCompute());
}

function ALUToMemRatioVertex()
{
    return (ALUInstructionPerInvocationVertex() / MemInstructionPerInvocationVertex());
}

function ALUToMemRatioFragment()
{
    return (ALUInstructionPerInvocationFragment() / MemInstructionPerInvocationFragment());
}

function ALUToMemRatio()
{
    return (ALUInstructionPerInvocation() / MemInstructionPerInvocation());
}

function ROPStall()
{
    return (AMDStat_ROP_Stalled_Ticks / AMDStat_GPU_Engine_Busy_Ticks) * 100;
}

function ZeroAreaCullPrims()
{
    return AMDStat_ZeroArea_Culled_Prims;
}

function ZeroAreaCullPrimsPercentage()
{
    return (AMDStat_ZeroArea_Culled_Prims * 100 / PrimitivesSubmitted());
}

function ClipperCullPrims()
{
    return AMDStat_Clipping_Culled_Prims;
}

function ClipperCullPrimsPercentage()
{
    return (AMDStat_Clipping_Culled_Prims * 100 / PrimitivesSubmitted());
}

function TextureUnitStall()
{
    return AMDStat_TexUnit_Stall;
}

function TextureUnitBusy()
{
    return AMDStat_TexUnit_Busy;
}

function TextureCacheMissRate()
{
    return (AMDStat_TextureCache_Miss / (AMDStat_TextureCache_Miss + AMDStat_TextureCache_Hit)) * 100;
}

function VertexMemoryFetchLatency()
{
    return (AMDStat_IA_MemRead_Bin0 * 64 + AMDStat_IA_MemRead_Bin1 * (128 + 64) + AMDStat_IA_MemRead_Bin2 * (128 * 2 + 64) + AMDStat_IA_MemRead_Bin3 * (128 * 3 + 64) + AMDStat_IA_MemRead_Bin4 * (128 * 4 + 64) + AMDStat_IA_MemRead_Bin5 * (128 * 5 + 64) + AMDStat_IA_MemRead_Bin6 * (128 * 6 + 64) + AMDStat_IA_MemRead_Bin7 * (128 * 7 + 64)) / (AMDStat_IA_MemRead_Bin0 + AMDStat_IA_MemRead_Bin1 + AMDStat_IA_MemRead_Bin2 + AMDStat_IA_MemRead_Bin3 + AMDStat_IA_MemRead_Bin4 + AMDStat_IA_MemRead_Bin5 + AMDStat_IA_MemRead_Bin6 + AMDStat_IA_MemRead_Bin7);
}

function NumMRT()
{
    return AMDStat_PostFS_Exports / AMDStat_PostFS_Pixels;
}

function PrimitiveRate()
{
    return AMDStat_FrontEnd_Busy * NumSE / (AMDStat_FrontEnd_Busy + AMDStat_FrontEnd_Stall + AMDStat_FrontEnd_StarvedBusy);
}

function VertexRate()
{
    return AMDStat_VS_Vertices_In * NumSE / (AMDStat_VS_Vertices_In + AMDStat_VS_Stalled_Ticks + AMDStat_VS_StarvedBusy_Ticks);
}

function PeakPrimitiveRate()
{
    return NumSE;
}

function PeakVertexRate()
{
    return NumSE;
}

function PeakPixelRate()
{
    return NumROP * 4;
}

function VertexRatePercentage()
{
    return VertexRate() * 100 / PeakVertexRate();
}

function PrimitiveRatePercentage()
{
    return PrimitiveRate() * 100 / PeakPrimitiveRate();
}

function PixelRatePercentage()
{
    return PixelRate() * 100 / PeakPixelRate();
}

function ParameterCacheStall()
{
    return AMDStat_ParameterCache_Stall;
}

function AAMode()
{
    return AMDStat_Quad_Fragments_Drawn / AMDStat_Quad_Drawn;
}

function TessellatorBusy()
{
    return AMDStat_Tessellator_Busy;
}
