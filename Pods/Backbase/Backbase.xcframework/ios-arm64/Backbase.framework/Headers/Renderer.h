//
//  Renderer.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 27/02/15.
//

#import <Foundation/Foundation.h>
@protocol RendererDelegate;
@protocol Renderable;

/**
 * Renderer protocol.
 * Objects conforming this protocol are able to render Renderable items and control their graphical properties.
 */
@protocol Renderer <NSObject>
@required

/**
 * Creates a new renderer object, it's required to enable native renderers.
 * @param frame The initial frame size of the native renderer
 * @param item The renderable this renderer is going to draw.
 * @return A new Renderer instance
 */
- (instancetype _Nonnull)initWithFrame:(CGRect)frame item:(NSObject<Renderable>* _Nonnull)item;

/**
 * Starts the rendering of a renderable item in a given container.
 * @param container Container where the item should be rendered.
 * @param error If an error occurs, upon return contains an NSError object that describes the problem.
 */
- (BOOL)start:(UIView* _Nonnull)container error:(NSError* _Nullable* _Nullable)error;

/**
 * Reloads the current renderable item.
 */
- (void)reload;

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

/**
 * Gets the reference of the renderable item used by this renderer. It will come handy with some asynchronous calls and
 * pub sub payloads.
 * @return The reference to the Renderable item used at the start method.
 */
- (NSObject<Renderable>* _Nonnull)item;

/**
 * Enables or disables the scrolling abilities of this renderer. Scrolling is enabled by default.
 * @param enable Enable/disable the scrolling
 */
- (void)enableScrolling:(BOOL)enable;

/**
 *  @return The current state of the scrolling (enable/disabled)
 */
- (BOOL)isScrollingEnabled;

/**
 * Enables or disables the bouncing of the scroll view abilities of this renderer. Bouncing is enabled by default.
 * @param enable Enable/disable the bouncing
 */
- (void)enableBouncing:(BOOL)enable;

/**
 * @return The current state of the bouncing (enable/disabled)
 */
- (BOOL)isBouncingEnabled;

/**
 * Notifies the Renderer that its controller will appear on the screen.
 * @discussion Typically the view controller is the one notified of this event. However, Renderer implementations might
 * rely on this life-cycle event to shape their behavior, for instance, subscribe to events or unsubscribe if not
 * visible. The view controller's life-cycle events should notify its Renderer using the counter part method
 * viewWillAppear
 */
- (void)willAppear;

/**
 * Notifies the Renderer that its controller has appeared on the screen.
 * @discussion Typically the view controller is the one notified of this event. However, Renderer implementations might
 * rely on this life-cycle event to shape their behavior, for instance, subscribe to events or unsubscribe if not
 * visible. The view controller's life-cycle events should notify its Renderer using the counter part method
 * viewDidAppear
 */
- (void)didAppear;

/**
 * Notifies the Renderer that its controller will disappear of the screen.
 * @discussion Typically the view controller is the one notified of this event. However, Renderer implementations might
 * rely on this life-cycle event to shape their behavior, for instance, subscribe to events or unsubscribe if not
 * visible. The view controller's life-cycle events should notify its Renderer using the counter part method
 * viewWillDisappear
 */
- (void)willDisappear;

/**
 * Notifies the Renderer that its controller has disappeared from the screen.
 * @discussion Typically the view controller is the one notified of this event. However, Renderer implementations might
 * rely on this life-cycle event to shape their behavior, for instance, subscribe to events or unsubscribe if not
 * visible. The view controller's life-cycle events should notify its Renderer using the counter part method
 * viewDidDisappear
 */
- (void)didDisappear;

@optional

/**
 * Dispatches an event in the renderer's window object.
 * @param event The name of the event.
 * @param payload A JSON serializable object.
 */
- (void)dispatchEvent:(NSString* _Nonnull)event payload:(id _Nullable)payload;

/**
 * Sets a delegate to respond to events created by the Renderer.
 * This should be called <b>BEFORE</b> the rendering has started.
 * @param delegate Instance conforming the protocol to respond to the events.
 */
- (void)delegate:(NSObject<RendererDelegate>* _Nullable)delegate;
@end
