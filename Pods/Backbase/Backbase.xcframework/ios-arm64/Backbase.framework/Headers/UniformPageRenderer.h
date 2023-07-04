//
//  UniformPageRenderer.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 13/03/17.
//  Copyright © 2017 Backbase R&D B.V. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <Backbase/Backbase.h>

#ifndef UNIFORMPAGERENDERER_CLASS
#define UNIFORMPAGERENDERER_CLASS

/// Renderer for Renderables that contains multiple children. Disregarding the amount of children (1 or more), it will
/// create a PageRendererView that will allow to add multiple children and layout them as the view decides.
@interface UniformPageRenderer : NativeRenderer
@end

#endif
