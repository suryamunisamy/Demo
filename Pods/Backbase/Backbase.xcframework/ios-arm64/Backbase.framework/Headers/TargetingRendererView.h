//
//  TargetingView.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 31/07/2018.
//  Copyright © 2018 Backbase R&D B.V. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <Backbase/Backbase.h>

#ifndef TARGETINGRENDERERVIEW_PROTOCOL
#define TARGETINGRENDERERVIEW_PROTOCOL

/**
 * Conforming object will be notified about events on the alternative selection and rendering.
 */
@protocol TargetingRendererView <NativeView>

/**
 * Conforming object will be notified when the targeting renderer starts the alternative selection.
 * @discussion: This method will allow the view to present a spinner while the alternative selection is
 * made.
 */
- (void)alternativeSelectionDidStart;

/**
 * Conforming object will be notified when the targeting renderer has successfully selected an alternative.
 * @discussion: This method will allow the view to make some preparations for the rendering of the selected
 * alternative, e.g. hide spinners, show the placeholder for the alternative etc.
 * @note: Either this method will be called or alternativeSelectionDidFailWithError.
 */
- (void)alternativeSelectionDidSucceed;

/**
 * Conforming object will be notified about the failed attempt to select an alternative.
 * @discussion: This method will allow the view to handle errors by displaying error messages or allowing
 * retry actions if error permits.
 * @param error Error object containing information about the failure reason.
 * @note: Either this method will be called or alternativeSelectionDidSucceed.
 */
- (void)alternativeSelectionDidFailWithError:(NSError* _Nonnull)error NS_SWIFT_NAME(alternativeSelectionDidFail(with:));

/**
 * Conforming object will be notified about the failed attempt to render a selected alternative.
 * @discussion: This method will allow the view to handle errors by displaying error messages or hide
 * elements with errors.
 * @param error Error object containing information about the failure reason.
 */
- (void)alternativeRenderingDidFailWithError:(NSError* _Nonnull)error NS_SWIFT_NAME(alternativeRenderingDidFail(with:));

/**
 * Conforming object provides a view where the selected alternative will be rendered.
 * @discussion: The rendering is responsibility to the TargetingRenderer implementation rather than the
 * view, hence, the view only needs to provide the insert point for the selected alternative.
 * @return A view in the hierarchy that will be used to render the selected alternative.
 */
- (UIView* _Nonnull)alternativePlaceholder;

@end

#endif
