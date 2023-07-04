//
//  PageRenderer.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 13/03/17.
//  Copyright © 2017 Backbase R&D B.V. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <Backbase/Backbase.h>

#ifndef PAGERENDERER_CLASS
#define PAGERENDERER_CLASS

/// Renderer for Renderables that may or may not contain multiple children. When the renderable item contains only one
/// child, it will simply proxy the calls the that child Renderer, at the same time no additional intermediate view is
/// added. When the renderable item contains two or more children it will create a PageRendererView that will allow to
/// add multiple children and layout them as the view decides.
@interface PageRenderer : NativeRenderer
@end

#endif
