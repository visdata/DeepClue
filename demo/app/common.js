/**
 * Created by WL on 2016-12-09.
 */

var drag_text = d3.behavior.drag()
    .on('dragstart', textDragStart)
    .on('drag', textDragMove)
    .on('dragend', textDragEnd);

function textDragStart(d) {
    svg_contour
        //.call(zoomListener)
        .on("mousedown.zoom", null); //暂时解绑
        //.on("touchstart.zoom", null)
        //.on("touchmove.zoom", null)
        //.on("touchend.zoom", null);
}

function textDragMove(d) {
    d3.select(this)
        .attr('x', d3.event.x)
        .attr('y', d3.event.y);
}

function textDragEnd(d) {
    svg_contour
        .call(zoomListener);    //重新绑定zoom事件

}