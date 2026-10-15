param([string]$OutputDir = (Join-Path $PSScriptRoot '..\public\assets\home-v7'), [switch]$LibraryOnly)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
# Packaging only: keep generated artwork; remove exterior export backgrounds,
# trim unused canvas and scale to production sizes. No font or artwork drawing.
Add-Type -ReferencedAssemblies @('System.Drawing.Common', 'System.Drawing.Primitives', 'System.Private.Windows.GdiPlus', 'System.Private.Windows.Core') -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Drawing.Drawing2D;
using System.Runtime.InteropServices;
public static class HomeStickerPack {
  public static string Prepare(string input, string output, string mode, int maxWidth) {
    using (var original = new Bitmap(input))
    using (var source = new Bitmap(original.Width, original.Height, PixelFormat.Format32bppArgb)) {
      using (var g = Graphics.FromImage(source)) { g.CompositingMode = CompositingMode.SourceCopy; g.DrawImageUnscaled(original,0,0); }
      int w=source.Width,h=source.Height,n=w*h;
      var bits=source.LockBits(new Rectangle(0,0,w,h),ImageLockMode.ReadWrite,PixelFormat.Format32bppArgb);
      var pixels=new byte[bits.Stride*h]; Marshal.Copy(bits.Scan0,pixels,0,pixels.Length);
      var outside=new bool[n];
      if(mode=="perimeter") {
        // The neutral checkerboard is outside the closed blue/yellow silhouette.
        // Flood only from the canvas edges; enclosed white paper stays opaque.
        var barrier=new bool[n];
        for(int y=0;y<h;y++) for(int x=0;x<w;x++) {
          int p=y*bits.Stride+x*4,b=pixels[p],g=pixels[p+1],r=pixels[p+2];
          barrier[y*w+x]=(b-r>14 && b-g>8 && r<160) || (Math.Min(r,g)-b>45);
        }
        var queue=new int[n]; int head=0,tail=0;
        for(int y=0;y<h;y++) for(int x=0;x<w;x++) if(x==0||x==w-1||y==0||y==h-1) {
          int i=y*w+x; if(!outside[i]&&!barrier[i]) {outside[i]=true;queue[tail++]=i;}
        }
        while(head<tail) {
          int i=queue[head++],x=i%w,y=i/w;
          if(x>0) Visit(i-1,barrier,outside,queue,ref tail);
          if(x<w-1) Visit(i+1,barrier,outside,queue,ref tail);
          if(y>0) Visit(i-w,barrier,outside,queue,ref tail);
          if(y<h-1) Visit(i+w,barrier,outside,queue,ref tail);
        }
      }
      int x1=w,y1=h,x2=-1,y2=-1;
      for(int y=0;y<h;y++) for(int x=0;x<w;x++) {
        int p=y*bits.Stride+x*4,b=pixels[p],g=pixels[p+1],r=pixels[p+2];
        bool magenta=r>100 && b>100 && Math.Min(r,b)-g>12;
        bool remove=mode=="perimeter" ? outside[y*w+x] : mode=="magenta" && magenta;
        if(remove || pixels[p+3]<6) {pixels[p]=pixels[p+1]=pixels[p+2]=pixels[p+3]=0;}
        if(pixels[p+3]>8) {x1=Math.Min(x1,x);x2=Math.Max(x2,x);y1=Math.Min(y1,y);y2=Math.Max(y2,y);}
      }
      Marshal.Copy(pixels,0,bits.Scan0,pixels.Length);source.UnlockBits(bits);
      if(x2<x1) throw new Exception("Empty sprite: "+input);
      int cw=x2-x1+1,ch=y2-y1+1;
      // Refuse a missing/fragmented closed-outline extraction.
      if(mode=="perimeter" && source.GetPixel(w/2,h/2).A<250) throw new Exception("Paper center removed: "+input);
      int dw=Math.Min(maxWidth,cw),dh=(int)Math.Round(ch*(double)dw/cw),pad=4;
      using(var crop=source.Clone(new Rectangle(x1,y1,cw,ch),PixelFormat.Format32bppArgb))
      using(var canvas=new Bitmap(dw+pad*2,dh+pad*2,PixelFormat.Format32bppArgb)) {
        using(var g=Graphics.FromImage(canvas)) {
          g.Clear(Color.Transparent);g.CompositingMode=CompositingMode.SourceCopy;
          g.InterpolationMode=InterpolationMode.HighQualityBicubic;g.PixelOffsetMode=PixelOffsetMode.HighQuality;
          g.DrawImage(crop,new Rectangle(pad,pad,dw,dh),new Rectangle(0,0,cw,ch),GraphicsUnit.Pixel);
        }
        canvas.Save(output,ImageFormat.Png);
        return String.Format("{0}: {1}x{2}; source-bbox=({3},{4},{5},{6}); mode={7}",output,canvas.Width,canvas.Height,x1,y1,x2,y2,mode);
      }
    }
  }
  static void Visit(int i,bool[] barrier,bool[] outside,int[] queue,ref int tail) {
    if(!barrier[i]&&!outside[i]) {outside[i]=true;queue[tail++]=i;}
  }
  public static string Audit(string path) {
    using(var image=new Bitmap(path)) {
      int w=image.Width,h=image.Height,min=255,max=0,transparent=0,magenta=0;
      var bits=image.LockBits(new Rectangle(0,0,w,h),ImageLockMode.ReadOnly,PixelFormat.Format32bppArgb);
      var data=new byte[bits.Stride*h]; Marshal.Copy(bits.Scan0,data,0,data.Length);
      for(int y=0;y<h;y++) for(int x=0;x<w;x++) {
        int p=y*bits.Stride+x*4,a=data[p+3],b=data[p],g=data[p+1],r=data[p+2];
        min=Math.Min(min,a);max=Math.Max(max,a);if(a==0) transparent++;
        if(a>16 && r>180 && b>160 && g<80) magenta++;
      }
      image.UnlockBits(bits);
      bool corners=image.GetPixel(0,0).A==0 && image.GetPixel(w-1,0).A==0 && image.GetPixel(0,h-1).A==0 && image.GetPixel(w-1,h-1).A==0;
      if(!corners || min!=0 || max!=255 || magenta>0) throw new Exception("Alpha/color audit failed: "+path);
      return String.Format("PASS {0}: alpha {1}-{2}, corners transparent, transparent pixels {3}, magenta {4}",path,min,max,transparent,magenta);
    }
  }
}
'@

if ($LibraryOnly) { return }

$sourceRoot='E:\Codex\.codex\generated_images\01a00e76-e7a7-7b20-bc0a-2a3ce82f3f1c'
$assets=@(
  @('status-panel','exec-3b5bac57-5ed8-41d5-b48c-c395bb490d62.png','perimeter',800),
  @('match-panel','exec-43c98a21-00a8-426d-95f3-3a88fe53b052.png','perimeter',1200),
  @('feed-panel','exec-1c6b673e-66bb-46fb-9cae-fbf6ac61db44.png','perimeter',1200),
  @('next-title','exec-4aa9eca0-e77c-47b4-9441-1b6ecc7c2877.png','alpha',600),
  @('feed-title','exec-dbe7ca46-64c3-4e8c-97d5-036ce938a78e.png','alpha',700),
  @('cta-panel','exec-028416da-8962-47eb-9a2a-18e630dd374e.png','alpha',1200),
  @('nav-selected','exec-89f1a23e-0f51-473f-9d89-6bd1821233c9.png','alpha',400),
  @('play-wordmark','exec-82c76a1d-0908-4e9c-b150-366f1fce264a.png','alpha',700)
)
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
foreach($asset in $assets) {
  [HomeStickerPack]::Prepare((Join-Path $sourceRoot $asset[1]),(Join-Path $OutputDir ($asset[0]+'.png')),$asset[2],[int]$asset[3])
  [HomeStickerPack]::Audit((Join-Path $OutputDir ($asset[0]+'.png')))
}
