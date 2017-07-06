/**
 * Created by WL on 2016-12-09.
 */

var drag_text = d3.behavior.drag()
    .on('dragstart', textDragStart)
    .on('drag', textDragMove)
    .on('dragend', textDragEnd);

/**
 *
 ��ק�����Ŀ�ʼ�¼�����
 *
 */
function textDragStart() {
    svg_contour
        .on("mousedown.zoom", null); //��ʱ���
}

/**
 *
 ��ק�������¼�����
 *
 */
function textDragMove() {
    d3.select(this)
        .attr('x', d3.event.x)
        .attr('y', d3.event.y);
}

/**
 *
 ��ק�����Ľ����¼�����
 *
 */
function textDragEnd() {
    svg_contour
        .call(zoomListener);    //���°�zoom�¼�

}