//
//  NativeView.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 22/08/16.
//  Copyright © 2016 Backbase R&D B.V. All rights reserved.
//

#import <UIKit/UIKit.h>
@protocol NativeContract;

#ifndef NATIVEVIEW_PROTOCOL
#define NATIVEVIEW_PROTOCOL

/**
 * NativeView base protocol. Renderer's views must implement this protocol to allow separation of concerns and delegate
 * the creation and placement to the view implementation.
 */
@protocol NativeView <NSObject>
/**
 * Creates an UIView object than conforms the NativeView protocol. Additional to the creation of the view, this view
 * should get automatically inserted into the container view.
 *
 * @param contractImpl A NativeContract conforming class that will be used to make calls from the view.
 * @param container    The insert point where this view will be inserted
 *
 * @return A UIView that conforms the NativeView protocol
 */
+ (UIView<NativeView>* _Nullable)initializeWithContract:(NSObject<NativeContract>* _Nonnull)contractImpl
                                              container:(UIView* _Nonnull)container;

/**
 * The natural size for the receiving view, considering only properties of the view itself.
 *
 * @discussion Custom views typically have content that they display of which the layout system is unaware.
 * Setting this property allows a custom view to communicate to the layout system what size it would like to be based on
 * its content. This intrinsic size must be independent of the content frame, because there’s no way to dynamically
 * communicate a changed width to the layout system based on a changed height, for example.
 * If a custom view has no intrinsic size for a given dimension, it can use UIViewNoIntrinsicMetric for that dimension.
 *
 * @return The natural size of the view.
 */
@property (nonatomic, readonly) CGSize intrinsicContentSize;

@optional
/**
 * Notifies the NativeView that its Renderer will appear on the screen.
 */
- (void)willAppear;

/**
 * Notifies the NativeView that its Renderer has appeared on the screen.
 */
- (void)didAppear;

/**
 * Notifies the NativeView that its Renderer will disappear of the screen.
 */
- (void)willDisappear;

/**
 * Notifies the NativeView that its Renderer has disappeared from the screen.
 */
- (void)didDisappear;
@end

#endif
