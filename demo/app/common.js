/**
 * Created by WL on 2016-12-09.
 */

var drag_text = d3.behavior.drag()
    .on('dragstart', textDragStart)
    .on('drag', textDragMove)
    .on('dragend', textDragEnd);

/**
 *
 拖拽动作的开始事件监听
 *
 */
function textDragStart() {
    svg_contour
        .on("mousedown.zoom", null); //暂时解绑
}

/**
 *
 拖拽动作的事件监听
 *
 */
function textDragMove() {
    d3.select(this)
        .attr('x', d3.event.x)
        .attr('y', d3.event.y);
}

/**
 *
 拖拽动作的结束事件监听
 *
 */
function textDragEnd() {
    svg_contour
        .call(zoomListener);    //重新绑定zoom事件

}